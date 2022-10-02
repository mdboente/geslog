
frappe.treeview_settings["Cost Center"] = {
	breadcrumb: "Accounts",
	get_tree_root: false,
	filters: [{
		fieldname: "company",
		fieldtype:"Select",
		options: erpnext.utils.get_tree_options("company"),
		label: __("Company"),
		default: erpnext.utils.get_tree_default("company")
	}],
	root_label: "Cost Centers",
	get_tree_nodes: 'erpnext.accounts.utils.get_children',
	add_tree_node: 'erpnext.accounts.utils.add_cc',
	fields:[
		{
		    fieldtype:'Data',
            fieldname:'cost_center_name',
            label:__('Description'),
            reqd:true
        },
		{
		    fieldtype:'Check',
            fieldname:'is_group',
            label:__('Is Group'),
			description:__('Further cost centers can be made under Groups but entries can be made against non-Groups')
        },
        {
		    fieldtype:'Data',
            fieldname:'cost_center_number',
            label:__('Cost Center Number'),
			description: __("Number of new Cost Center, it will be included in the cost center name as a prefix")
		},
        {
            fieldtype: "Link",
            fieldname: "expense_account",
            options: "Account",
            label: __("Expense Account"),
            get_query: function(txt){
                return { filters: {account_type: "Expense Account"}}}
        }
	],
	ignore_fields:["parent_cost_center"],

}
