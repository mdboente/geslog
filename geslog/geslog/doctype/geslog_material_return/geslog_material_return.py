
import frappe
from erpnext.controllers.buying_controller import BuyingController
from frappe import _
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc

from geslog.controllers.status_updater import StatusUpdater


class GeslogMaterialReturn(StatusUpdater, BuyingController):

	def update_stock(self, stock_entry):

		status = "Transferred"
		items_to_return = {}

		for item in stock_entry.get("items") or []:
			item_qty = items_to_return.get(item.item_code, 0)
			item_qty = item_qty + item.qty
			items_to_return[item.item_code] = item_qty

		for req_item in self.get("items") or []:
			if req_item.item_code in items_to_return:
				stock_qty = items_to_return.get(req_item.item_code, 0)

				req_item.returned_qty += stock_qty

				if req_item.returned_qty < 0:
					self.returned_qty = 0

				if req_item.returned_qty != req_item.returned:
					status = "Pending"

		material_request = frappe.get_doc(
			"Geslog Material Request", self.get("material_request"))

		material_request.return_items(items_to_return)

		self.db_set("status", status)
		self.update_children()
		self.save()

	def validate_item_values(self):

		for item in self.get("items") or []:
			if not item.assigned:
				pass
			if item.assigend < item.returned:
				frappe.throw(_("Row {0}: There are more items to return than assigned"))

	def validate(self):
		pass

	def on_submit(self):
		self.status = "Pending"
		self.set_status(update_modified=True)


@frappe.whitelist()
def make_stock_entry(source_name, target_doc=None):
	def update_item(obj, target, source_parent):

		target.uom = obj.stock_uom
		target.basic_rate = obj.price
		target.qty = obj.returned - obj.returned_qty
		target.amount = target.qty
		target.transfer_qty = 0
		target.allow_zero_valuation_rate = 1
		target.conversion_factor = 1
		target.t_warehouse = obj.source_warehouse

	def set_missing_values(source, target):
		target.request_party = "Geslog Material Return"
		target.request_parent = source.name
		target.purpose = "Material Receipt"
		target.run_method("calculate_rate_and_amount")
		target.set_stock_entry_type()
		target.set_job_card_data()

	doclist = get_mapped_doc("Geslog Material Return", source_name, {
		"Geslog Material Return": {
			"doctype": "Stock Entry",
			"validation": {
				"docstatus": ["=", 1]
			}
		},
		"Geslog Material Return Item": {
			"doctype": "Stock Entry Detail",
			"postprocess": update_item
		}
	}, target_doc, set_missing_values)

	return doclist
