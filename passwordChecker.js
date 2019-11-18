import React, { Fragment } from 'react';
import PropTypes from 'prop-types';

import { Input } from './';

import { needsNumber, needsUppercase, needsLowercase, needsSpecialChar, passMinLength } from '../util/formValidations';
import { TranslatedCopy } from '../intl/TranslatedCopy';

const minLength = min => value => (value && value.length < min ? `Must be ${min} characters or more` : undefined);
const maxLength = max => value => (value && value.length > max ? `Must be ${max} characters or less` : undefined);
const passwordMatch = (value, allValues) =>
  allValues.newPassword === value ? undefined : 'Passwords do not match';
const passMinLength = minLength(8);
const needsUppercase = value =>
  value && !/^(?=.*[A-Z]).+$/.test(value) ? 'Needs an uppercase letter' : undefined;
const needsLowercase = value =>
  value && !/^(?=.*[a-z]).+$/.test(value) ? 'Needs a lowercase letter' : undefined;
const needsNumber = value => (value && !/^(?=.*[0-9]).+$/.test(value) ? 'Needs a number' : undefined);
const needsSpecialChar = value =>
  value && !/^(?=.*[!@#$%^&*(){}[\]/<>?.,:;"'|\\~`\-+=]).+$/.test(value) ? 'Needs a special character' : undefined;

const checkedIcon = <i data-desc='passwordCheck__checked' className='g72-check text-color-success' />;

const PasswordCheck = props => {
  const {
    meta: { pristine },
    input: { value }
  } = props;
  return (
    <Fragment>
      <Input {...props} />
      <div className='fs12-sm mb5-sm ta-sm-l'>
        <p><TranslatedCopy id='password.mustContain' /></p>
        <ul className='passwordChecklist'>
          <li data-desc='passwordCheck__min_Length'>
            {!pristine && !passMinLength(value) && checkedIcon} 
            {' '}
            <TranslatedCopy id='password.chars' />
          </li>
          <li data-desc='passwordCheck__uppercase'>
            {!pristine && !needsUppercase(value) && checkedIcon} 
            {' '}
            <TranslatedCopy id='password.uppercase' />
          </li>
          <li data-desc='passwordCheck__lowercase'>
            {!pristine && !needsLowercase(value) && checkedIcon} 
            {' '}
            <TranslatedCopy id='password.lowercase' />
          </li>
          <li data-desc='passwordCheck__number'>
            {!pristine && !needsNumber(value) && checkedIcon} 
            {' '}
            <TranslatedCopy id='password.number' />
          </li>
          <li data-desc='passwordCheck__special_char'>
            {!pristine && !needsSpecialChar(value) && checkedIcon} 
            {' '}
            <TranslatedCopy id='password.special' />
          </li>
        </ul>
      </div>
    </Fragment>
  );
};

PasswordCheck.propTypes = {
  meta: PropTypes.shape({
    pristine: PropTypes.bool.isRequired
  }).isRequired,
  input: PropTypes.shape({
    value: PropTypes.string.isRequired
  }).isRequired
};

export default PasswordCheck;
