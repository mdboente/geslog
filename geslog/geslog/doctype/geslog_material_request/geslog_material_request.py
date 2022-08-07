
import frappe
from frappe.model.document import Document
from frappe.utils import flt
from frappe.model.mapper import get_mapped_doc


class GeslogMaterialRequest(Document):

	@frappe.whitelist()
	def get_warehouses_operations(self, operation: str = None):
		client = self.get("client")
		operations = {"Request": [], "Transfer": [], "All": []}
		default_warehouse = frappe.db.get_single_value(
			"Geslog Settings", "default_warehouse")
		if client:
			warehouses = frappe.get_list(
				"Client Warehouse", {"parent": client}, ["warehouse", "operation"])

			warehouses.append(
				frappe._dict(warehouse=default_warehouse, operation="All"))

			for warehouse in warehouses or []:
				opes = {warehouse.operation}

				if warehouse.operation == "All":
					opes.update(operations.keys())

				for ope in opes:
					operations[ope].append(warehouse.warehouse)

		if operation:
			return {operation: operations.get(operation, [])}

		return {
			"default": default_warehouse,
			"operations": operations
		}

	@frappe.whitelist()
	def get_assigned_items(self):
		entries = frappe.get_list("Stock Entry", {
			"docstatus": 1,
			"request_party": "Geslog Material Request",
			"request_parent": self.name,
		})
		assigned_items = {}
		for entry in entries:
			doc = frappe.get_doc("Stock Entry", entry)
			items = doc.get("items")
			for item in items:
				assigned = assigned_items.get(item, frappe._dict())
				assigned.qty = assigned.get("qty", 0) + item.transfer_qty
				assigned.item_code = item.item_code
				assigned.stock_uom = item.stock_uom
				assigned_items[item.item_code] = assigned

		return assigned_items

	def update_stock(self, stock_entry):

		status = "Transferred"
		items_in_stock = {}

		for item in stock_entry.get("items") or []:
			item_qty = items_in_stock.get(item.item_code, 0)
			item_qty = item_qty + item.qty
			items_in_stock[item.item_code] = item_qty

		for req_item in self.get("items") or []:
			if req_item.item_code in items_in_stock:
				stock_qty = items_in_stock.get(req_item.item_code, 0)

				transferred_qty = req_item.qty - stock_qty
				if transferred_qty < 0:
					transferred_qty = 0

				req_item.transferred_qty += transferred_qty

				if req_item.transferred_qty != req_item.qty:
					status = "Pending"

		self.db_set("status", status)
		self.update_children()
		self.save()

	def before_submit(self):
		self.status = "Pending"


@frappe.whitelist()
def make_stock_entry(source_name, target_doc=None):
	def update_item(obj, target, source_parent):

		qty = flt(flt(obj.stock_qty) - flt(obj.transferred_qty)) \
			if flt(obj.stock_qty) > flt(obj.transferred_qty) else 0

		target.qty = qty
		target.transfer_qty = qty
		target.allow_zero_valuation_rate = 1
		target.conversion_factor = 1
		target.s_warehouse = obj.source_warehouse

	def set_missing_values(source, target):
		target.request_party = "Geslog Material Request"
		target.request_parent = source.name
		target.purpose = "Material Issue"
		target.run_method("calculate_rate_and_amount")
		target.set_stock_entry_type()
		target.set_job_card_data()

	doclist = get_mapped_doc("Geslog Material Request", source_name, {
		"Geslog Material Request": {
			"doctype": "Stock Entry",
			"validation": {
				"docstatus": ["=", 1]
			}
		},
		"Geslog Material Request Item": {
			"doctype": "Stock Entry Detail",
			"postprocess": update_item
		}
	}, target_doc, set_missing_values)

	return doclist