

function setup_fields(frm){

    frm.set_query("expense_account", () => {
        return { filters: { account_type: "Expense Account"}}
    })

    frm.set_query("cost_center", () => {
        return {
            filters: {
                is_task: frm.doc.is_associated_with !== "Cost Center",
                is_group: false
            }
        }
    })

    frm.set_query("set_warehouse", () => {
            return { filters: {is_client: frm.doc.material_request_type !== "Transfer between Warehouses",
                company: frappe.defaults.get_user_default("company")}}
        })

    get_default_warehouse(resp => {
            frm.set_value("set_from_warehouse", resp.default_warehouse)
        })

}

function get_default_warehouse(callback){
    frappe.db.get_value("Company",
        frappe.defaults.get_user_default("company"),
        "default_warehouse",
        callback)
}


frappe.ui.form.on('Material Request', {

    onload(frm){

        if (frm.doc.docstatus === 1 && frm.doc.status !== 'Stopped'){

            if(frm.doc.material_request_type === "Transfer between Warehouses"){
                            frm.add_custom_button(__("Transfer between Warehouses"),
                () => frm.events.make_stock_entry(frm), __('Create'));
            }

            if(frm.doc.material_request_type === "Return of Materials"){
                            frm.add_custom_button(__("Return of Materials"),
                () => frm.events.make_stock_entry(frm), __('Create'));
            }

        }


        setup_fields(frm)
    },
    material_request_type(frm){
        get_default_warehouse(resp => {
            frm.set_value("set_from_warehouse", resp.default_warehouse)
        })

        frm.set_query("set_warehouse", () => {
            return { filters: {is_client: frm.doc.material_request_type !== "Transfer between Warehouses",
                company: frappe.defaults.get_user_default("company")}}
        })
    },

    cost_center(frm){
        frappe.db.get_value("Cost Center", frm.doc.cost_center, "client")
            .then(resp => {
                frm.set_value("set_warehouse", resp.message.client)
            })
    },

    set_from_warehouse: function(frm) {
		if (frm.doc.set_from_warehouse) {
			frm.doc.items.forEach(d => {
				frappe.model.set_value(d.doctype, d.name,
					"from_warehouse", frm.doc.set_from_warehouse);
			})
		}
	},
    is_associated_with: (frm) => {

        let doc = frm.get_field("cost_center");
        doc.set_label(__(frm.doc.is_associated_with));

        frm.set_query("cost_center", () => {
            return {
                filters: {
                    is_task: frm.doc.is_associated_with !== "Cost Center",
                    is_group: false
                }
            }
        })
    }
})



