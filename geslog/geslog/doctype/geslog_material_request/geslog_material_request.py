
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt
from frappe.model.mapper import get_mapped_doc
from typing import Dict


class GeslogMaterialRequest(Document):

	def validate(self):
		self.validate_items()

	def after_insert(self):
		name = self.name
		cur_id = name.split("-")[1]
		next_id = str(int(cur_id) + 1).zfill(6)
		frappe.set_value("Client", self.get("client"), "next_request_number", next_id)

	def validate_items(self):
		reserved_items = self.get_reserved_items()
		for item in self.get("items"):
			for reserved_item in reserved_items:
				if item.qty > reserved_item.qty:
					frappe.throw(
						_("Row {0}: {1} cannot exceed the reserved qty ")
						.format(item.idx, item.description))

	def get_reserved_items(self):

		if self.get("associated_to") == "Task":
			task = frappe.get_doc("Geslog Task", self.get("task"))
			return task.items
		else:
			client = self.get("client")
			demand = frappe.get_last_doc("Demand", {"client": client})
			return demand.items

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

	def update_task_items(self, items: Dict[str, str], remove=True):

		task = frappe.get_doc("Geslog Task", self.get("task"))

		for item_in_stock in items:
			for item in task.get("items"):
				if item.item_code == item_in_stock:
					if remove:
						item.qty -= items.get(item.item_code)
					else:
						item.qty += items.get(item.item_code)

		task.save()

	def update_demand_items(self, stock_items: Dict[str, Dict], remove=False):

		client = self.get("client")
		demand = frappe.get_last_doc(
			"Demand", filters={"client": client})

		for stock_item in stock_items:
			for item in demand.get("items") or []:
				if item.item_code == stock_item:
					if remove:
						item.qty = flt(
							item.qty - stock_items.get(item.item_code))
					else:
						item.qty = flt(
							item.qty + stock_items.get(item.item_code))
		demand.save()

	def return_items(self, items_to_return):

		if self.get("associated_to") == "Task":
			self.update_task_items(items_to_return)
		else:
			self.update_demand_items(items_to_return)

		for req_item in self.get("items") or []:
			if req_item.item_code in items_to_return:
				returned_qty = items_to_return.get(req_item.item_code, 0)

				req_item.transferred_qty -= returned_qty

				if req_item.transferred_qty < 0:
					self.transferred_qty = 0

		self.update_children()
		self.save()

	def update_stock(self, stock_entry):

		status = "Transferred"
		items_in_stock = {}

		for item in stock_entry.get("items") or []:
			item_qty = items_in_stock.get(item.item_code, 0)
			item_qty = item_qty + item.qty
			items_in_stock[item.item_code] = item_qty

		if self.get("associated_to") == "Task":
			self.update_task_items(items_in_stock, remove=True)
		else:
			self.update_demand_items(items_in_stock, remove=True)

		for req_item in self.get("items") or []:
			if req_item.item_code in items_in_stock:
				stock_qty = items_in_stock.get(req_item.item_code, 0)

				req_item.transferred_qty += stock_qty

				if req_item.transferred_qty < 0:
					self.transferred_qty = 0

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

		qty = flt(flt(obj.qty) - flt(obj.transferred_qty)) \
			if flt(obj.qty) > flt(obj.transferred_qty) else 0

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


@frappe.whitelist()
def make_material_return(source_name, target_doc=None):

	def update_item(obj, target, source_parent):

		target.status = " "
		target.returned_qty = 0

	doclist = get_mapped_doc("Geslog Material Request", source_name, {
		"Geslog Material Request": {
			"doctype": "Geslog Material Return",
			"validation": {
				"docstatus": ["=", 1]
			}
		},
		"Geslog Material Request Item": {
			"doctype": "Geslog Material Return Item",
			"field_map": {
				"transferred_qty": "assigned",
				"uom": "stock_uom",
				"source_warehouse": "target_warehouse"
			},
			"postprocess": update_item,
			"condition": lambda obj: obj.transferred_qty != 0
		}
	}, target_doc)

	return doclist

