
from .overrides.workspace.workspace import CustomWorkspace


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


def after_migrate():
	""" Execute After migrations are done """

	setup_workspaces()
