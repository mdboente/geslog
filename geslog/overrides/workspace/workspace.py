""" Custom Workspace Module """

import frappe
from frappe.desk.doctype.workspace.workspace import Workspace


class CustomWorkspace(Workspace):
	""" CustomWorkspace class """

	@classmethod
	def delete_workspaces(
			cls, docs_to_delete: list = None, excepts_docs: list = None):

		if not docs_to_delete:
			docs_to_delete = frappe.get_list("Workspace", pluck="name")

		for workspace in docs_to_delete:
			if workspace not in excepts_docs:
				doc = frappe.get_doc("Workspace", workspace)
				if doc:
					cls.delete(doc)
