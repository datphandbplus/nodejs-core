const REGEXES = {
	ZIP			: '^[0-9]{5}$',
	NUMBER		: '^(\\s*(?=.*[1-9])[0-9]*(?:\\.[0-9]{1,})?\\s*)?$',
	NUMBER_STEP	: '^(\\s*(?=.*[1-9])[0-9]*(?:\\.[0|5]{1})?\\s*)?$',
	CHARACTER	: '^([A-Za-z0-9 ]*)?$',
	EMAIL		: '^([_A-Za-z0-9-\\+]+(\\.[_A-Za-z0-9-]+)*@[A-Za-z0-9-]+(\\.[A-Za-z0-9]+)*(\\.[A-Za-z]{2,4}))?$',
	WEBSITE		: '^((www\\.)?[_A-Za-z0-9-\\+]+\\.[A-Za-z]{2,4}(\\.[A-Za-z]{2,4})?)?$',
	MOBILE_PHONE: '^((\\+?84|0)?((3([2-9]))|(5([689]))|(7([0|6-9]))|(8([1-5]))|(9([0-9])))([0-9]{7}))?$',
};

module.exports = REGEXES;
