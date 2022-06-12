

frappe.ui.form.on("Cost Center", {
	setup(frm){

		frm.set_query("client", () => {
			return {filters: { is_client: 1}}
		})

		frm.set_query("item_group", "item_group", () => {
			return { filters: { associate_to_cost_center: 1}}
		})
	},
	is_task(frm){
		frm.set_query("item_group", "item_group", () => {
			return { filters: { associate_to_cost_center: !frm.doc.is_task}}
		})
	}
})
