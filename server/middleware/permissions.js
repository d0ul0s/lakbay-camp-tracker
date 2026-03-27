/**
 * Permission middleware factory.
 * Usage: requirePermission('registrants', 'add')
 *
 * Reads the permission matrix from req.permissionMatrix (attached by
 * the attachPermissions middleware that must run before this).
 * Admin always passes through.
 */
function requirePermission(page, action) {
  return (req, res, next) => {
    if (req.user.role === 'admin') return next();

    const matrix = req.permissionMatrix;
    if (!matrix) {
      return res.status(403).json({ message: 'Permission matrix unavailable.' });
    }

    const rolePerms = matrix[req.user.role];
    if (!rolePerms || !rolePerms[page] || !rolePerms[page][action]) {
      return res.status(403).json({
        message: `Forbidden: your role does not have '${action}' permission on '${page}'.`
      });
    }

    next();
  };
}

/**
 * Deep merge source into target (non-destructive — source values win).
 * Only merges plain objects. Arrays and primitives are taken from source.
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object'
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Middleware that loads the latest permission matrix from DB and attaches
 * it to req.permissionMatrix. Deep-merges with DEFAULT_MATRIX so that
 * newer keys added to the default are always available even if not yet saved
 * to the DB (prevents silent 403s on Coordinator/Treasurer roles).
 */
const Settings = require('../models/Settings');
const { DEFAULT_MATRIX } = require('../models/Settings');

async function attachPermissions(req, res, next) {
  if (req.user.role === 'admin') return next(); // admin always full access
  try {
    const settings = await Settings.findOne().lean();
    const dbMatrix = (settings && settings.permissionMatrix) ? settings.permissionMatrix : {};
    // Deep-merge: start with DEFAULT as base, overlay DB-saved values on top
    const merged = {};
    for (const role of Object.keys(DEFAULT_MATRIX)) {
      merged[role] = deepMerge(DEFAULT_MATRIX[role], dbMatrix[role] || {});
    }
    req.permissionMatrix = merged;
    next();
  } catch (err) {
    console.error('attachPermissions error:', err);
    req.permissionMatrix = DEFAULT_MATRIX;
    next();
  }
}

module.exports = { requirePermission, attachPermissions };
