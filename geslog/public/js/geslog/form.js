

frappe.provide("geslog.form")

geslog.form.select_not_checked_links = function (frm, field, child_field){
    let current_values = frm.doc[field] || [];

        frm.set_query(child_field, field, () => {
            return {
                filters: {
                    name: ["not in", current_values
						.filter(e => e[child_field])
						.map(e => {return e[child_field]})]
                }
            }
        })
}
