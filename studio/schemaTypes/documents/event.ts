import {defineField, defineType} from 'sanity'

type EventDocument = {
  startAt?: string
  endAt?: string
}

export const event = defineType({
  name: 'event',
  title: 'Public event',
  type: 'document',
  description: 'Public event information only. Do not record attendees or participants.',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().min(5).max(120),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.min(10).max(500),
    }),
    defineField({
      name: 'startAt',
      title: 'Starts at',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'endAt',
      title: 'Ends at',
      type: 'datetime',
      validation: (rule) =>
        rule.custom((value, context) => {
          const document = context.document as EventDocument | undefined

          if (!value || !document?.startAt) {
            return true
          }

          return new Date(value).getTime() > new Date(document.startAt).getTime()
            ? true
            : 'End time must be later than start time.'
        }),
    }),
    defineField({
      name: 'location',
      title: 'Public location',
      type: 'string',
      validation: (rule) => rule.max(160),
    }),
    defineField({
      name: 'href',
      title: 'Optional event page or registration link',
      type: 'string',
      description:
        'Use an SSKEMS path or an approved https URL. Do not store registration responses in Sanity.',
      validation: (rule) =>
        rule.custom((value) =>
          !value || value.startsWith('/') || value.startsWith('https://')
            ? true
            : 'Enter an internal path beginning with / or an https URL.',
        ),
    }),
    defineField({
      name: 'publication',
      title: 'Publication control',
      type: 'publication',
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [
    {
      title: 'Start date, soonest first',
      name: 'startAtAsc',
      by: [{field: 'startAt', direction: 'asc'}],
    },
  ],
  preview: {
    select: {
      title: 'title',
      startAt: 'startAt',
      location: 'location',
    },
    prepare({title, startAt, location}) {
      const date = startAt ? new Date(startAt).toLocaleString('en-IN') : 'Date not set'
      return {title, subtitle: `${date}${location ? ` | ${location}` : ''}`}
    },
  },
})
