
frappe.ui.form.on("Stock Entry", {
    refresh(frm){

        frm.set_value("request_by", frappe.user.full_name())

        if(!frm.is_new() && frm.doc.request_parent && frm.doc.request_party) {
            frm.add_custom_button("View Request",
                () => frappe.set_route("Form", frm.doc.request_party, frm.doc.request_parent))
        }
    }
})