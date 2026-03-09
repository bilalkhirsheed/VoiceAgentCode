// Dealer model
const dealerSchema = {
  tableName: 'dealers',
  columns: {
    id: 'id',
    dealer_name: 'dealer_name',
    dealer_code: 'dealer_code',
    timezone: 'timezone',
    address: 'address',
    city: 'city',
    state: 'state',
    country: 'country',
    zip_code: 'zip_code',
    website_url: 'website_url',
    default_voice: 'default_voice', // male / female
    primary_phone: 'primary_phone',
    created_at: 'created_at',
    updated_at: 'updated_at'
  }
};

module.exports = dealerSchema;