/**
 * Westhead Gates — Cloudflare Worker configuration.
 *
 * The counterpart to api/config.php. Same settings, same job: this is the
 * only file you need to edit to change how the site behaves on Cloudflare.
 *
 * Secrets do NOT live here. The mail provider's API key is set once with
 *   npx wrangler secret put MAIL_API_KEY
 * and read from the environment at runtime.
 */

export const config = {
  // ---------------------------------------------------------------------
  // Where enquiries are sent. Add more addresses to send to several people.
  // ---------------------------------------------------------------------
  enquiryRecipients: ['info@westhead-gates.co.uk'],

  // ---------------------------------------------------------------------
  // The address enquiries are sent FROM.
  //
  // This must be an address on a domain you have verified with your mail
  // provider. Sending from the visitor's own address is what lands enquiries
  // in spam or gets them rejected outright by SPF — their address goes in
  // Reply-To instead, so hitting reply in the inbox still works.
  // ---------------------------------------------------------------------
  mailFrom: 'website@westhead-gates.co.uk',
  mailFromName: 'Westhead Gates website',

  // Subject line prefix, so enquiries are easy to filter in your inbox.
  subjectPrefix: '[Website enquiry]',

  // ---------------------------------------------------------------------
  // Gallery
  // ---------------------------------------------------------------------

  // Path photos are served under. Matches the folder name on Plesk and the
  // key prefix in R2, so one set of URLs works on both.
  imagesPath: 'images',

  // File types accepted. Anything else is ignored.
  imageExtensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'],

  // Newest photos first. Set to 'name' to order by filename instead, which
  // lets you control the order with prefixes like 01-, 02-, 03-.
  gallerySort: 'newest',

  // How long the assembled photo list is cached at the edge, in seconds.
  // A new photo appears within this long of being uploaded.
  galleryCacheSeconds: 300,

  // ---------------------------------------------------------------------
  // Spam controls
  // ---------------------------------------------------------------------

  // Reject submissions completed faster than this many seconds. Real people
  // take longer than 3 seconds to fill in a form; bots do not.
  minSecondsOnPage: 3,

  // Maximum enquiries accepted from one IP address per hour. Needs the RATE
  // KV namespace to be bound; without it this is skipped.
  rateLimitPerHour: 6,
};

/**
 * The subject dropdown on contact.html, mapped to readable labels for the
 * email. Keep in step with the <option> values in contact.html.
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
