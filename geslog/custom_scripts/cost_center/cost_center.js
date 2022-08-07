

frappe.ui.form.on("Cost Center", {
	setup(frm){
		frm.set_query("expense_account", () => {
			return {
				filters : {
					account_type: "Expense Account"
				}
			}
		})
	}
})

frappe.ui.form.on("Cost Center Expense Element", {
	expense_elements_add(frm){
		let current_elements = frm.doc.expense_elements || [];
        frm.set_query("element","expense_elements", () => {
            return {
                filters: {
                    name: ["not in", current_elements
						.filter(e => e.element)
						.map(e => {return e.element})]
                }
            }
        })

	}
})
