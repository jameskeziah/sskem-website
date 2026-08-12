import {admissionCycle} from './documents/admissionCycle'
import {announcement} from './documents/announcement'
import {event} from './documents/event'
import {siteSettings} from './documents/siteSettings'
import {contactDetails} from './objects/contactDetails'
import {publication} from './objects/publication'

export const schemaTypes = [
  publication,
  contactDetails,
  siteSettings,
  announcement,
  admissionCycle,
  event,
]
