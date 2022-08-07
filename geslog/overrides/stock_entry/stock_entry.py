
import frappe
from erpnext.stock.doctype.stock_entry.stock_entry import StockEntry


class CustomStockEntry(StockEntry):

	def on_submit(self):
		request_party = self.get("request_party")
		request_parent = self.get("request_parent")

		if request_party and request_parent:
			request = frappe.get_doc(request_party, request_parent)
			request.update_stock(self)
