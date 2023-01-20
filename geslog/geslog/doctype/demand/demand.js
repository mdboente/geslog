
function setup_year_field(frm){

    if(frm.is_new()) {
        let current_date = new Date()
        let year_list = geslog.datetime.get_range_years_list(current_date.getFullYear(), 5)
        frm.set_df_property("year", "options", year_list)
        frm.set_value("year", current_date.getFullYear())
    }
}

frappe.ui.form.on('Demand', {
	refresh(frm){
       setup_year_field(frm)
    }
});

frappe.ui.form.on("Demand Item", {
    items_add(frm){
        geslog.form.select_not_checked_links(frm, "items", "item_code")
    },
    qty(frm, dt, dn) {
        let doc = frappe.get_doc(dt, dn);
        if(doc && frm.doc.docstatus === 0) doc.real_qty = doc.qty
    }
})
