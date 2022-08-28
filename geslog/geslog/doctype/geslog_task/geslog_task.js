

function setup_year_field(frm){
    let current_date = new Date()
    let year_list = geslog.datetime.get_range_years_list(current_date.getFullYear(), 5)
    frm.set_df_property("year", "options", year_list)
    frm.set_value("year", current_date.getFullYear())
}


frappe.ui.form.on('Geslog Task', {
    refresh(frm){
       setup_year_field(frm)
    }
});


frappe.ui.form.on("Geslog Task Items", {
    items_add(frm){
        let current_items = frm.doc.items || []
        frm.set_query("item_code","items", () => {
            return {
                filters: {
                    name: ["not in", current_items
						.filter(e => e.item_code)
						.map(e => {return e.item_code})]
                }
            }
        })
    }
})
