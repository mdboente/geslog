""" Setup Workspaces Patch Module """

from ..overrides.workspace.workspace import CustomWorkspace


def setup_workspaces():
	""" Delete unnecessary workspaces """

	excepts_docs = [
		"Geslog",
		"Users",
		"Settings",
		"Tools",
		"Integrations",
		"Utilities"
	]

	CustomWorkspace.delete_workspaces(excepts_docs=excepts_docs)


def execute():
	""" Setup WorkSpaces Patch Execute """
	setup_workspaces()
