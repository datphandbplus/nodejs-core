const BODY_VALIDATION_ERROR = {
	REQUIRED: '{0} is required',
	INVALID	: '{0} does not appear to be valid',
	EXISTS	: '{0} does not exists',
	LENGTH	: '{0} must has length from {1} to {2}',
	MIN		: '{0} must greater or equal than {1}',
	MAX		: '{0} must less or equal than {1}',
	RANGE	: '{0} must be in range({1}, {2})',
	IN		: '{0} must be ({1})',
};

module.exports = BODY_VALIDATION_ERROR;
