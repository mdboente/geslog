
function save_max_item_qty() {
    let {items} = cur_frm.get_doc();

    cur_frm.max_item_qty = {}

    items.forEach(item => {
        cur_frm.max_item_qty[item.item_code] = item.qty
    })
}


frappe.ui.form.on("Stock Entry", {
    refresh(frm){

        save_max_item_qty()

        if(frm.is_new()) frm.set_value("request_by", frappe.user.full_name())

        if(!frm.is_new() && frm.doc.request_parent && frm.doc.request_party) {
            frm.add_custom_button("View Request",
                () => frappe.set_route("Form", frm.doc.request_party, frm.doc.request_parent))
        }
    },


})

frappe.ui.form.on("Stock Entry Detail", {
    qty(frm, cdt, cdn){

        let {qty, item_code, item_name} = frappe.get_doc(cdt, cdn)

        if( qty >= frm.max_item_qty[item_code]) {
            frappe.throw(`No se pueden seleccionar más de ${frm.max_item_qty[item_code]} productos de tipo ${item_name}`)
        }
    }
})