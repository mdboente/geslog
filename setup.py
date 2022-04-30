from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in geslog/__init__.py
from geslog import __version__ as version

setup(
	name="geslog",
	version=version,
	description="Geslog App ",
	author="Maura Elena ",
	author_email="mdboente@gmail.com",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
