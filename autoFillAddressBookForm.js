import React, { Component } from 'react';
import { connect } from 'react-redux';
import { PropTypes } from 'prop-types';
import { Field, reduxForm } from 'redux-form';
import classnames from 'classnames';

import { Button, CountrySelect, Input, RenderInBody, Select, Spinner } from '../components';
import DeleteAddress from './deleteAddress';
import { TranslatedCopy } from '../intl/TranslatedCopy';
import { required, maxLength10, maxLength25, maxLength35, noSelectSpecialChars } from '../util/formValidations';
import countries from '../util/countries';

import { closeSidebar, deleteAddress, requestAddresses, saveAddress, updateAddress } from './actions';
import { sapAddresses } from './reducer';

import { getUserData, getUserAccount } from '../user/reducer';
import { openModal } from '../components/modal/actions';

import { addressTypes } from '../types/address';
import { userAccountTypes } from '../types/user';

export class AddressBookForm extends Component {
  state = {
    normalizedCountries: [],
    normalizedStates: []
  };

  componentDidMount() {
    const { sapAddresses } = this.props;

    if (sapAddresses) {
      this.initializeCountries();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { editAddress, account, closeSidebar, reset, sapAddresses } = this.props;
    const { normalizedCountries } = this.state;

    if (
      (!editAddress && prevProps.editAddress !== editAddress) ||
      (account &&
        account.number &&
        prevProps.account &&
        prevProps.account.number &&
        account.number !== prevProps.account.number)
    ) {
      this.resetCountry();
      reset();
      closeSidebar();
    }

    if (prevProps.sapAddresses !== sapAddresses) {
      this.initializeCountries();
    }

    if (prevState.normalizedCountries !== normalizedCountries) {
      this.initializeAutoComplete();
    }
  }

  setRef = node => (this.textInput = node);

  setNormalizedCountries = normalizedCountries => this.setState({ normalizedCountries });

  setNormalizedStates = normalizedStates => this.setState({ normalizedStates });

  autocomplete = null;

  // Overriding Chromes autofill.
  observerHack = new MutationObserver(() => {
    this.observerHack.disconnect();
    const name = document.getElementById('addressName');
    const address = document.getElementById('address');

    if (name && address) {
      name.setAttribute('autocomplete', 'name0');
      address.setAttribute('autocomplete', 'address1');
    }
  });

  initializeAutoComplete = () => {
    const { normalizedCountries } = this.state;
    const canObserveMutation = window && 'MutationObserver' in window;

    if (canObserveMutation) {
      this.observerHack.observe(document.getElementById('address'), {
        attributes: true,
        attributeFilter: ['autocomplete']
      });
      // Create the autocomplete object, restricting the search to geographical location types.
      this.autocomplete = new window.google.maps.places.Autocomplete(document.getElementById('address'), {
        types: ['geocode']
      });

      this.autocomplete.setComponentRestrictions({ country: normalizedCountries.map(country => country.value) });

      // When the user selects an address from the dropdown, populate the address fields in the form.
      this.autocomplete.addListener('place_changed', this.fillInAddress);
    }
  };

  initializeCountries = () => {
    const { sapAddresses } = this.props;
    const normalizedCountries = [];
    const normalizedStates = [];

    countries.forEach(country => {
      if (sapAddresses && country.code2 === sapAddresses[0].addresses[0].country) {
        const normalizeLabel = label => label.split(' ').join().toLowerCase();
        normalizedCountries.push({ value: country.code2, label: country.name });
        normalizedStates.push(
          country.states
            .map(state => ({ value: state.code, label: state.name }))
            .sort((a, b) => {
              const labelA = normalizeLabel(a.label)
              const labelB = normalizeLabel(b.label);
              if (labelA < labelB) return -1;
              if (labelA > labelB) return 1;
              return 0;
            })
        );
      } else if (!sapAddresses) {
        normalizedCountries.push({ value: country.code2, label: country.name });
      }
    });
    this.setNormalizedCountries(normalizedCountries);
    this.setNormalizedStates(normalizedStates);
  };

  fillInAddress = () => {
    const { change } = this.props;
    const { normalizedCountries } = this.state;

    // Get address details from the autocomplete object.
    const newAddress = this.autocomplete.getPlace().address_components.reduce(
      (addressObj, field) => ({
        ...addressObj,
        [field.types[0]]: this.formatAddressField(field)
      }),
      {}
    );

    const streetWithNumber = newAddress.street_number
      ? `${newAddress.street_number} ${newAddress.route}`
      : newAddress.route;
    const stateIsRequired =
      normalizedCountries.length > 0 &&
      (normalizedCountries[0].value === 'US' || normalizedCountries[0].value === 'CA');

    // TODO: Review ruleset for regions without state and no-abbr field options before removing this check
    if (stateIsRequired) change('state', newAddress.administrative_area_level_1);

    change('city', newAddress.locality || newAddress.sublocality_level_1 || newAddress.neighborhood);
    change('address', streetWithNumber);
    change('country', newAddress.country);
    change('postal', newAddress.postal_code);
  };

  formatAddressField = field => {
    switch (field.types[0]) {
      case 'administrative_area_level_1':
        return {
          value: field.short_name,
          label: field.long_name
        };
      default:
        return field.short_name;
    }
  };

  resetCountry = () => this.props.change('country', '');

  toggleView = () => this.setState(state => ({ showListView: !state.showListView }));

  refreshAddressList = () => {
    const { fetchAddresses, closeSidebar } = this.props;
    closeSidebar();
    fetchAddresses();
  };

  handleDelete = addressId => {
    const { deleteAddress, setSearchTerm, userData } = this.props;
    deleteAddress({ username: userData.id, addressId }).then(() => {
      setSearchTerm('');
      this.refreshAddressList();
    });
  };

  submitForm = address => {
    const {
      closeSidebar,
      editAddress,
      handleAddressClick,
      isCheckout,
      requestAddresses,
      reset,
      saveAddress,
      setSearchTerm,
      updateAddress,
      userData
    } = this.props;
    const submitFn = editAddress ? updateAddress : saveAddress;

    // handle object being passed on custom addresses not recognized by address autofill
    const savedAddress = {
      ...address,
      state: typeof address.state === 'string' ? address.state : address.state ? address.state.value : '',
      country: typeof address.country === 'string' ? address.country : address.country.value
    };

    return submitFn({ username: userData.username, address: savedAddress }).then(async () => {
      reset();
      setSearchTerm('');
      closeSidebar();
      requestAddresses({ username: userData.username }).then(({ payload }) => {
        if (isCheckout) {
          const normalizedAddress = {
            ...savedAddress,
            name: savedAddress.addressName,
            addressLine1: savedAddress.address,
            cityStateZip: `${savedAddress.city}, ${savedAddress.state} ${savedAddress.postal}`
          };
          // If user adds a new address in checkout, we need to request the ID from the DB before passing it along
          const currOneTimeId = payload.filter(
            addr => addr.name === normalizedAddress.name && addr.addressLine1 === normalizedAddress.addressLine1
          );

          if (currOneTimeId) {
            handleAddressClick({ address: { ...normalizedAddress, id: currOneTimeId[0].id }, isNewAddress: true });
          }
        }
      });
    });
  };

  handleSaveAddressClick = e => this.props.handleSubmit(this.submitForm)(e);

  submitButton = () => {
    const { addressBookForm, editAddress, isOpen, invalid, submitting, pristine, isCheckout } = this.props;
    let hasNotUpdated = true;

    function formUpdates(original, updated) {
      const originalValues = Object.values(original).filter(val => !!val);
      const updatedValues = Object.values(updated).filter(val => !!val);
      return updatedValues.every(updatedElement => originalValues.includes(updatedElement));
    }

    if (addressBookForm && addressBookForm.values && editAddress) {
      const { city, state, postal } = addressBookForm.values;
      const formValues = {
        cityStateZip: `${city}, ${state} ${postal}`,
        isLocked: false,
        ...addressBookForm.values
      };

      hasNotUpdated = formUpdates(editAddress, formValues);
    }

    const submitButtonText = isCheckout ? (
      <TranslatedCopy id='addressBook.form.edit.checkout.submit' />
    ) : (
      <TranslatedCopy id='addressBook.form.edit.submit' />
    );

    return (
      <div className={classnames('sidebar__submit', { isOpen: isOpen })}>
        <Button
          extraClassName='u-full-width'
          onClick={this.handleSaveAddressClick}
          disabled={invalid || submitting || (editAddress && hasNotUpdated) || pristine}
          data-desc='addressBookForm__button_submit'
        >
          {submitting ? <Spinner className='relative-container p3-sm' /> : submitButtonText}
        </Button>
      </div>
    );
  };

  handleEditAddressLoad = () => {
    if (this.props.editAddress) {
      const {
        editAddress: { id, name, addressLine1, attention, city, state, country, zipCode },
        change
      } = this.props;

      change('addressName', name);
      change('attention', attention);
      change('address', addressLine1);
      change('city', city);
      change('state', state);
      change('country', country === 'USA' ? 'US' : country);
      change('postal', zipCode);
      change('id', id);
    }
  };

  render() {
    const { editAddress, isCheckout, openModal, submitting } = this.props;
    const { normalizedCountries, normalizedStates } = this.state;

    return (
      <div className='pb12-sm' onLoad={this.handleEditAddressLoad}>
        {isCheckout ? this.submitButton() : <RenderInBody>{this.submitButton()}</RenderInBody>}
        <Field
          name='addressName'
          component={Input}
          label={new TranslatedCopy({ id: 'global.form.addressName' }).toString()}
          placeholder={{ id: 'global.form.addressName' }}
          validate={[required, maxLength25, noSelectSpecialChars]}
          maxLength='25'
          required
        />
        <Field
          name='attention'
          component={Input}
          label={new TranslatedCopy({ id: 'global.attn' }).toString()}
          placeholder={{ id: 'global.attn' }}
          validate={[maxLength35, noSelectSpecialChars]}
          maxLength='35'
        />
        <Field
          name='address'
          component={Input}
          label={new TranslatedCopy({ id: 'global.form.address' }).toString()}
          validate={[required, maxLength35, noSelectSpecialChars]}
          maxLength='35'
          placeholder={{ id: 'global.form.address.placeholder' }}
          ref={this.setRef}
          required
        />
        <Field
          name='city'
          component={Input}
          label={new TranslatedCopy({ id: 'global.form.city' }).toString()}
          validate={[required, maxLength35, noSelectSpecialChars]}
          maxLength='35'
          placeholder={{ id: 'global.form.city.placeholder' }}
          required
        />
        <Field
          name='state'
          component={Select}
          options={normalizedStates[0] || []}
          label={new TranslatedCopy({ id: 'global.form.state' }).toString()}
          validate={[required]}
          placeholder={{ id: 'global.form.state.placeholder' }}
          clearable
          required
          forceDropdown
        />
        <Field
          name='country'
          component={CountrySelect}
          label={new TranslatedCopy({ id: 'global.country' }).toString()}
          validate={[required]}
          options={normalizedCountries}
          placeholder={{ id: 'global.form.country.placeholder' }}
          autoComplete='country'
          clearable={false}
          initialValue={normalizedCountries[0]}
          required
          isCountry
          forceDropdown
        />
        <Field
          name='postal'
          component={Input}
          label={new TranslatedCopy({ id: 'global.form.zip' }).toString()}
          validate={[required, maxLength10, noSelectSpecialChars]}
          maxLength='10'
          placeholder={{ id: 'global.form.zip.placeholder' }}
          required
        />
        {editAddress && (
          <DeleteAddress
            handleDelete={this.handleDelete}
            openModal={openModal}
            addressId={editAddress.id}
            submitting={submitting}
          />
        )}
      </div>
    );
  }
}

AddressBookForm.propTypes = {
  account: userAccountTypes,
  addressBookForm: PropTypes.any.isRequired,
  change: PropTypes.func.isRequired,
  closeSidebar: PropTypes.func.isRequired,
  deleteAddress: PropTypes.func.isRequired,
  editAddress: PropTypes.any,
  fetchAddresses: PropTypes.func.isRequired,
  handleAddressClick: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  invalid: PropTypes.bool.isRequired,
  isCheckout: PropTypes.bool,
  isOpen: PropTypes.bool,
  openModal: PropTypes.func.isRequired,
  pristine: PropTypes.bool.isRequired,
  requestAddresses: PropTypes.func.isRequired,
  reset: PropTypes.func.isRequired,
  sapAddresses: PropTypes.arrayOf(PropTypes.shape(addressTypes)),
  saveAddress: PropTypes.func.isRequired,
  setSearchTerm: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
  updateAddress: PropTypes.func.isRequired,
  userData: PropTypes.any
};

AddressBookForm.defaultProps = {
  account: null,
  editAddress: null,
  isCheckout: false,
  sapAddresses: null,
  userData: null,
  isOpen: false
};

const mapStateToProps = state => ({
  account: getUserAccount(state),
  addressBookForm: state.form.addressBookForm,
  sapAddresses: sapAddresses(state),
  userData: getUserData(state)
});

const connector = connect(
  mapStateToProps,
  { closeSidebar, deleteAddress, openModal, requestAddresses, saveAddress, updateAddress }
);

export default reduxForm({
  form: 'addressBookForm'
})(connector(AddressBookForm));
