

function setup_material_request_field(frm){
    frm.set_query("material_request", () => {
        return {
            filters: {
                status: ["in", ["Transferred", "Pending"]],
                associated_to: "Cost Center"
            }
        }
    })
}

function setup_request_by_field(frm){
    if(!frm.doc.request_by){
        frappe.db.get_value("Employee",
            {user_id: frappe.session.user_email},
            "name"
        ).then(value => {
            frm.set_value("request_by", value.message.name)
        })
    }
}

function setup_items_field(frm){
    let items = frm.material_request_doc.items;
    items.forEach(item => {
        let items_field = frm.get_field("items");
        items_field.wrapper.getElementsByClassName("grid-buttons")[0].hidden = true
        frm.doc.items = []
        console.log(item)
        frm.add_child("items", {
            "item_code": item.item_code,
            "description": item.description,
            "assigned": item.transferred_qty,
            "returned": 0
        })
        frm.refresh_field("items")
    })

}

function on_material_request(frm){
    if(frm.doc.material_request){
        frappe.db.get_doc("Geslog Material Request", frm.doc.material_request)
            .then(doc => {
                frm.material_request_doc = doc || []
                setup_items_field(frm)
            })
    }
}

function validate_items(items){
    items.forEach(item => {
        if(item.returned > item.assigned){
            frappe.throw(__("Row {0}: There are more items to return than assigned", [item.idx, item.item_code]))
        }
    })
}

frappe.ui.form.on('Geslog Material Return', {
    refresh(frm){
        setup_material_request_field(frm)
        setup_request_by_field(frm)
    },
    validate(frm){
        validate_items(frm.doc.items || [])
    },
    material_request(frm){
        on_material_request(frm)
    }
});

frappe.ui.form.on("Geslog Material Return Item", {
    returned(frm, cdt, cdn){
        let doc = frappe.get_doc(cdt, cdn);
        validate_items([doc])
    }
})
