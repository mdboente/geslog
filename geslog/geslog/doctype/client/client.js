
frappe.ui.form.on('Client', {

    refresh(frm){
         geslog.form.select_not_checked_links(frm, "warehouse", "warehouse")
    },

	access_to_all_warehouses_with_all_operations(frm){
	    frm.doc.warehouse = []
        if(frm.doc.access_to_all_warehouses_with_all_operations){
            frappe.db.get_list(
	        "Warehouse",
            {
                filters: {"is_group": false},
                fields: ["name", "type"]
            }).then(resp => {
                    resp.forEach(warehouse => {
                        const default_operation = "ALL";
                        frm.add_child("warehouse", {
                            "warehouse": warehouse.name,
                            "warehouse_type": warehouse.type,
                            "operation": default_operation
                        })
                        frm.refresh_field("warehouse")
                    })
                })
        }
        frm.refresh_field("warehouse")
    }
});
