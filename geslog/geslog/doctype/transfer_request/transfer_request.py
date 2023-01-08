# Copyright (c) 2022, Maura Elena  and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc
from frappe.utils import flt


class TransferRequest(Document):

	def validate(self):
		self.validate_warehouses()

	def validate_warehouses(self):
		for item in self.get("items") or []:
			if item.get("source_warehouse") == item.get("target_warehouse"):
				frappe.throw(
					_("Source and target warehouse cannot be same for row {}")
				)

	def before_validate(self):
		for item in self.get("items") or []:

			if not item.source_warehouse:
				item.source_warehouse = self.get("from_warehouse")

			if not item.target_warehouse:
				item.target_warehouse = self.get("to_warehouse")

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

				req_item.transferred_qty += stock_qty

				if req_item.transferred_qty < 0:
					self.transferred_qty = 0

				if req_item.transferred_qty != req_item.stock_qty:
					status = "Pending"

		self.db_set("status", status)
		self.update_children()
		self.save()


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
		target.t_warehouse = obj.target_warehouse

	def set_missing_values(source, target):
		target.request_party = "Transfer Request"
		target.request_parent = source.name
		target.purpose = "Material Transfer"
		target.run_method("calculate_rate_and_amount")
		target.set_stock_entry_type()
		target.set_job_card_data()

	doclist = get_mapped_doc("Transfer Request", source_name, {
		"Transfer Request": {
			"doctype": "Stock Entry",
			"field_map": {
				"from_warehouse": "from_warehouse",
				"to_warehouse": "to_warehouse"
			},
			"validation": {
				"docstatus": ["=", 1]
			}
		},
		"Transfer Request Item": {
			"doctype": "Stock Entry Detail",
			"postprocess": update_item
		}
	}, target_doc, set_missing_values)

	return doclist