""" Migrate Module """

from .overrides.workspace.workspace import CustomWorkspace


def after_migrate():
	CustomWorkspace.setup_workspaces()
