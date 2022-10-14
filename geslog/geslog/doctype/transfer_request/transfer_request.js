


frappe.ui.form.on('Transfer Request', {

    refresh(frm){

        const status_indicator_color = {
            'Pending': "orange",
            'Transferred': 'blue'
        };
        if(!frm.is_new() &&  Object.keys(status_indicator_color).includes(frm.doc.status)){
            frm.page.set_indicator(frm.doc.status, status_indicator_color[frm.doc.status])
        }

        if (frm.doc.docstatus === 1 && frm.doc.status !== "Transferred") {
                frm.add_custom_button(__("Stock Entry"),
                    () => frm.events.make_stock_entry(frm), __('Create'));
        }
        frm.events.get_default_client()

    },
    get_default_client(){
        frappe.db.get_value("Employee", {"user_id": frappe.session.user}, ["client", "name"],
            value => {
                cur_frm.set_value("client", value.client)
                cur_frm.set_value("requester", value.name)
            })
    },
    make_stock_entry: function(frm) {
		frappe.model.open_mapped_doc({
			method: "geslog.geslog.doctype.transfer_request.transfer_request.make_stock_entry",
			frm: frm
		});
	},
    from_warehouse(frm){
        frm.update_in_all_rows("items", "source_warehouse", frm.doc.from_warehouse)
    },
    to_warehouse(frm){
        frm.update_in_all_rows("items", "target_warehouse", frm.doc.to_warehouse)
    },
    client(frm){
        let client = frm.doc.client;
        if(client){
            frm.events.get_warehouse_operations(client)
                .then(warehouses => {

                    let {default_warehouse, operations:{Transfer:transfer, Request:request}} = warehouses;

                    frm.set_value("from_warehouse", default_warehouse)

                    frm.set_query("from_warehouse", () => {
                        return {filters: {name: ["in", request]}}
                    })

                    frm.set_query("to_warehouse", () => {
                        return {filters: {name: ["in", transfer]}}
                    })
                }
            )
        }
    },

    task(frm){

        frappe.db.get_doc("Geslog Task", frm.doc.task)
            .then(task => {
                frm.doc.items = []
                task.items.forEach(item => {

                    let child_item = frm.add_child("items",{
                            item_code: item.item_code,
                            description: item.description,
                            uom: item.uom,
                            qty: item.amount,
                            source_warehouse: frm.doc.from_warehouse
                        })

                    frm.events.get_item_details(frm, child_item)
                })
            })

    },

    get_warehouse_operations: function (client = null) {
        return new Promise(resolve => {
            frappe.call({
                method:"geslog.geslog.doctype.client.client.get_warehouses_operations",
                args: {
                    client: cur_frm.doc.client
                }
            }).then(resp => resolve(resp.message))
        })
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
					qty: item.qty || 1,
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

                frm.refresh_field("items")
            }
        });
        return "";
    }
});

frappe.ui.form.on("Transfer Request Item", {
    item_code(frm, cdt, cdn){
        let item = frappe.get_doc(cdt, cdn);
        item.source_warehouse = frm.doc.from_warehouse
        item.target_warehouse = frm.doc.to_warehouse
        frm.events.get_item_details(frm, item)
    }
})
