# Copyright (c) 2022, Maura Elena  and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class Client(Document):
	pass


@frappe.whitelist()
def get_warehouses_operations(client, operation: str = None):
	operations = {"Request": [], "Transfer": [], "All": []}
	default_warehouse = frappe.db.get_single_value(
		"Geslog Settings", "default_warehouse")
	if client:
		warehouses = frappe.get_list(
			"Client Warehouse", {"parent": client},
			["warehouse", "operation"])

		for warehouse in warehouses or []:
			opes = {warehouse.operation}

			if warehouse.operation == "All":
				opes.update(operations.keys())

			for ope in opes:
				operations[ope].append(warehouse.warehouse)

	if operation:
		return {operation: operations.get(operation, [])}

	return {
		"default_warehouse": default_warehouse,
		"operations": operations
	}
