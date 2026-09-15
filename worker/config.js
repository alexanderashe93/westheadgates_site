/**
 * Westhead Gates Ltd — contact form settings.
 *
 * This is the only file you need to edit to change who gets the enquiries.
 *
 * The API key does NOT live here. It is set once, encrypted, with
 *   npx wrangler secret put MAIL_API_KEY
 * and read from the environment at runtime.
 *
 * (The gallery has no settings to keep here: its photo list is built from
 * public/images/ by scripts/build-gallery.mjs at deploy time.)
 */

export const config = {
  // Where enquiries are sent. Add more addresses to send to several people.
  enquiryRecipients: ['info@westhead-gates.co.uk'],

  // The address enquiries are sent FROM. It must be on a domain verified
  // with your mail provider. Sending from the visitor's own address is what
  // lands enquiries in spam or gets them rejected outright by SPF — their
  // address goes in Reply-To, so hitting reply in the inbox still works.
  mailFrom: 'website@westhead-gates.co.uk',
  mailFromName: 'Westhead Gates website',

  // Subject line prefix, so enquiries are easy to filter in your inbox.
  subjectPrefix: '[Website enquiry]',

  // --- Spam controls ---------------------------------------------------

  // Reject submissions completed faster than this many seconds. Real people
  // take longer than 3 seconds to fill in a form; bots do not.
  minSecondsOnPage: 3,

  // Maximum enquiries accepted from one IP per hour. Needs the RATE KV
  // namespace to be bound; without it this is skipped.
  rateLimitPerHour: 6,
};

/**
 * The subject dropdown on contact.html, mapped to readable labels for the
 * email. Keep in step with the <option> values in public/contact.html.
 */
export const SUBJECTS = {
  gates: 'Sliding or swing gates',
  railings: 'Railings or balustrade',
  staircase: 'Staircase',
  spiral: 'Spiral staircase',
  balcony: 'Balcony',
  steel: 'Structural steel',
  other: 'Something else',
};
