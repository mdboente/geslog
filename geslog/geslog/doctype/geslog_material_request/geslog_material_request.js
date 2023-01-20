

function calculate_total_amount(frm){
    frm.doc.total_amount = 0;
    frm.doc.items.forEach(item => {
        frm.doc.total_amount += item.amount || 0;
    });
    frm.refresh_field("total_amount");
}

function setup_cost_center_field(){
    cur_frm.set_query("cost_center", () => {

        let {client, expense_account} = cur_frm.doc;

        let filters = {};

        if(client){filters["client"] = client}
        if(expense_account){filters["expense_account"] = expense_account};
        return {
            doctype: "Cost Center",
            doc: cur_frm.doc,
            filters: filters,
            query: "geslog.geslog.doctype.geslog_material_request.geslog_material_request.get_cost_centers"
        };
    })
}

function setup_task_field(){
    cur_frm.set_query("task", () => {
        let filters = {};
        if(cur_frm.doc.client){filters["client"] = cur_frm.doc.client}
        return {"filters": filters};
    })
}

function setup_expense_account(frm){
    frm.set_query("expense_account", () => {
        return {filters: {"account_type": "Expense Account"}};
    })
}

function setup_client_field(frm){

        if(!frm.doc.client){
            const role_with_all_permission = "Admin Client"
            if(frappe.user.has_role(role_with_all_permission)) {
                frm.set_df_property("client", "read_only", 0);
            }

            frappe.db.get_list("Employee", {
                filters: {user_id: frappe.session.user},
                fields: ["name", "client", "employee_name"]
            }).then(employees => {

                let employee = employees[0];

                if(employee){
                    frm.set_value("request_by", employee.employee_name);

                    if(!employee.client){
                        frappe.msgprint({
                            title: "Missing Client",
                            indicator: "Red",
                            message: __("The employee {0} has no assigned client",[employee.employee_name]),
                            primary_action: {
                                label: "Go to List View",
                                client_action: "frappe.set_route",
                                args: ["Form", "Geslog Material Request"]
                            }
                        });
                    }
                    return employee.client;
                }
            }).then(client => {

                frappe.db.get_value("Client", {"name": client}, "abbr")
                    .then(value => {
                        frm.set_value("client", client)
                        frm.set_value("client_abbr", value.message.abbr)
                    })

            })
        }
}

function warehouse_permissions(frm){

    if(!frm.doc.client) return ;

    frappe.call({
        method:"geslog.geslog.doctype.client.client.get_warehouses_operations",
        args: {
            client: frm.doc.client
        }
    }).then(resp => {
        const transfer_operation = resp.message.operations[frm.client_operations.TRANSFER];
        const request_operation = resp.message.operations[frm.client_operations.REQUEST];

        let transfer_query_filters = () => {return {filters: { is_group: false, name: ["in", transfer_operation] }}};
        let request_query_filters = () => {return {filters: {is_group: false, name: ["in", request_operation] }}};

        if(!frm.doc.default_source_warehouse){
            frm.set_value("default_source_warehouse", resp.message.default)
        }

        frm.set_query("default_source_warehouse", request_query_filters);
        frm.set_query("source_warehouse", "items", request_query_filters);
        frm.set_query("default_target_warehouse", transfer_query_filters);
        frm.set_query("target_warehouse", "items", transfer_query_filters);
    });
}


frappe.ui.form.on('Geslog Material Request', {

    refresh(frm){

        frm.transaction_types = {
            MATERIAL_REQUEST: "Material Request",
            MATERIAL_RETURN: "Material Return",
            TRANSFER_REQUEST: "Transfer Request",
        };

        frm.client_operations = {
	        ALL: "All",
	        TRANSFER: "Transfer",
            REQUEST: "Request"
        };

         const status_indicator_color = {
            'Pending': "orange",
            'Transferred': 'blue'
        };
        if(!frm.is_new() &&  Object.keys(status_indicator_color).includes(frm.doc.status)){
            frm.page.set_indicator(frm.doc.status, status_indicator_color[frm.doc.status])
        }

        frappe.db.get_single_value("Geslog Settings", "default_warehouse").then(value => { frm.set_value("default_source_warehouse", value) } )

        warehouse_permissions(frm)
        setup_expense_account(frm)
        setup_task_field(frm)
        setup_cost_center_field(frm)
        setup_cost_center_field(frm)
        setup_client_field(frm)
        calculate_total_amount(frm)

        if (frm.doc.docstatus === 1) {
                frm.add_custom_button(__("Stock Entry"),
                    () => frm.events.make_stock_entry(frm), __('Create'));

                frm.add_custom_button(__("Material Return"),
                    () => frm.events.make_material_return(frm), __("Create"));
        }
    },

    validate(frm){

    },

    get_reserved_items(){
        let reserved_items = [];

        if(cur_frm.demand){
            reserved_items = cur_frm.demand.items.map(i => i.item_code)

        }else if(cur_frm.task && cur_frm.task.use_reservation){
            reserved_items = cur_frm.task.items.map(i => i.item_code);
        }

        return reserved_items
    },

    setup_items_field(frm){

        frm.set_query("item_code", "items", () => {

            let query = {}

            let reserved_items = frm.events.get_reserved_items();
            let selected_items = frm.doc.items.filter(i => i.item_code).map(i => {return  i.item_code})


            if(reserved_items.length > 0){
                query["filters"] = {
                    item_code: ["in", [...reserved_items].filter(i => !selected_items.includes(i))]
                }
            }

            return query
        })

    },

    cost_center(frm){
	    const cost_center = frm.doc.cost_center;
	    if(cost_center){
	        frappe.db.get_doc("Cost Center", cost_center)
                .then(doc => {
                    frm.set_value("client", doc.client)
                    let expense_elements = doc.expense_elements || [];
                    frm.set_query("expense_element", () => {
                        return {filters: {"name": ["in", expense_elements
                                    .map(e => {return e.element})]}}
                    })
                })
        }
    },

    associated_to(frm){
        frm.events.setup_items_field(frm)
    },
    task(frm){
	    let task = frm.doc.task
	    if(task){
            frappe.db.get_doc("Geslog Task", task)
                .then( doc => {
                    if(doc.use_reservation){
                        frm.set_value("reservation_number", doc.reservation_number)
                    }
                    frm.set_df_property("reservation_number", "hidden", !doc.use_reservation)
                    frm.set_value("client", doc.client)

                    frm.task = doc

                    frm.doc.items = []
                    doc.items.forEach(item => {
                        let child_item = frm.add_child("items", {
                            item_code: item.item_code,
                            description: item.description,
                            uom: item.uom,
                            qty: item.qty,
                            source_warehouse: frm.doc.default_source_warehouse
                        })

                        frm.events.get_item_details(frm, child_item)

                    })
                    frm.events.setup_items_field(frm)
                })
        }
    },

    expense_account(frm){
	    setup_cost_center_field(frm)
    },

    client(frm){
	    warehouse_permissions(frm)
        setup_cost_center_field(frm)
        setup_task_field(frm)

        frm.events.get_demand().then(() => {
            frm.events.setup_items_field(frm)
        })

        let client = frm.doc.client;
	    if(client){
	        frappe.db.get_value("Client", {name: client}, "abbr")
                .then(value => {
                    frm.set_value("client_abbr", value.message.abbr)
                })
        }
    },

    get_demand(){
        let client = cur_frm.doc.client;

        return frappe.db.get_value("Client", {name: client}, "requests_on_demand")
            .then(value => {
                if(value.message.requests_on_demand){
                    frappe.db.get_doc("Demand", null, {"client": client})
                        .then( demand => {
                            cur_frm.demand = demand
                            return demand
                        })
                }
            })
    },

    default_source_warehouse(frm){
        if(frm.doc.default_source_warehouse){
           frm.doc.items.forEach(d => {
				frappe.model.set_value(d.doctype, d.name,
					"source_warehouse", frm.doc.default_source_warehouse);
			})
        }
    },

    make_material_return: function (frm){
        frappe.model.open_mapped_doc({
            "method": "geslog.geslog.doctype.geslog_material_request.geslog_material_request.make_material_return",
            frm: frm
        })
    },

    make_stock_entry: function(frm) {
		frappe.model.open_mapped_doc({
			method: "geslog.geslog.doctype.geslog_material_request.geslog_material_request.make_stock_entry",
			frm: frm
		});
	},

    calculate_total_amount(frm){
        frm.doc.total_amount = 0;
        frm.doc.items.forEach(item => {
            frm.doc.total_amount += item.amount || 0;
        });
        frm.refresh_field("total_amount");
    },

    calculate_item_amount(frm, item){
        item.qty = item.qty || 0;
        item.price = item.price || 0;
        item.amount = item.price * item.qty;
        frm.events.calculate_total_amount(frm);
    },

    get_item_details(frm, item){
        if(item && !item.item_code){ return; }
        frm.call({
			method: "erpnext.stock.get_item_details.get_item_details",
			child: item,
			args: {
				args: {
					item_code: item.item_code,
					from_warehouse: item.source_warehouse,
					warehouse: item.source_warehouse,
					doctype: frm.doc.doctype,
					buying_price_list: frappe.defaults.get_default('buying_price_list'),
					currency: frappe.defaults.get_default('Currency'),
					name: frm.doc.name,
					stock_qty: item.qty || 1,
					company: frappe.defaults.get_default('company'),
					conversion_rate: 1,
					material_request_type: frm.doc.material_request_type,
					plc_conversion_rate: 1,
					rate: item.rate,
					conversion_factor: item.conversion_factor
				},
				overwrite_warehouse: false
			},
            callback(resp){
			    let item_detail = resp.message;
			    item.price = item_detail.valuation_rate
                item.actual_qty = item_detail.actual_qty
                item.description = item_detail.item_name
                item.stock_qty = item_detail.stock_qty
                frm.events.calculate_item_amount(frm, item)
                frm.refresh_field("items")
            }
        });
        return "";
    }
});


frappe.ui.form.on("Geslog Material Request Item", {

    items_add(frm, cdt, cdn){
        let item = frappe.get_doc(cdt, cdn);
        item.source_warehouse = frm.doc.default_source_warehouse;
        if(frm.task && frm.task.limit_reservation){
            item_code.qty = frm.task.items.find(i => i.item_code === item.item_code)
        }
    },

    qty(frm, dt, dn){
        let item = frappe.get_doc(dt, dn);
        item.amount = item.price * item.qty
        calculate_total_amount(frm)
    },

    source_warehouse(frm, cdt, cdn){
        let item = frappe.get_doc(cdt, cdn);
        frm.events.get_item_details(frm, item)
    },
    price(frm, cdt, cdn) {
        let item = frappe.get_doc(cdt, cdn);
        frm.events.get_item_details(frm, item)
    },

    item_code(frm, cdt, cdn){
        let item = frappe.get_doc(cdt, cdn);
        frm.events.get_item_details(frm, item)
    },

})