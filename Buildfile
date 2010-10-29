# ==========================================================================
# LocalStorage - Buildfile
# Copyright: (c) 2010 - Strobe Inc., Peter Wagenet, and contributors.
# License:   Licensed under MIT license (see license.js)
# ==========================================================================

config :all, :required => ['sproutcore/runtime']

# CORE FRAMEWORKS
config :foundation, :required => []

# WRAPPER FRAMEWORKS
config :local_storage, :required => [:foundation]
