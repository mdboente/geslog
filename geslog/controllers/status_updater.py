import frappe
from frappe.model.document import Document


status_map = {
	"Geslog Material Return": [
		["Draft", None],
		["Cancelled", "eval:self.docstatus == 2"],
		["Pending", "eval:self.status != 'Pending' and self.docstatus == 1"],
		["Transferred", "eval:self.status != 'Pending' and self.docstatus == 1"],
	],
}


class StatusUpdater(Document):
	"""
		Updates the status of the calling records
		Delivery Note: Update Delivered Qty, Update Percent and Validate over delivery
		Sales Invoice: Update Billed Amt, Update Percent and Validate over billing
		Installation Note: Update Installed Qty, Update Percent Qty and Validate over installation
	"""

	def set_status(self, update=False, status=None, update_modified=True):
		if self.is_new():
			if self.get('amended_from'):
				self.status = 'Draft'
			return

		if self.doctype in status_map:
			_status = self.status
			if status and update:
				self.db_set("status", status)

			if self.status != _status and self.status not in ("Cancelled", "Partially Ordered",
																"Ordered", "Issued", "Transferred"):
				self.add_comment("Label", frappe._(self.status))

			if update:
				self.db_set('status', self.status, update_modified = update_modified)