import {defineField, defineType} from 'sanity'

export const announcement = defineType({
  name: 'announcement',
  title: 'Announcement',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().min(5).max(100),
    }),
    defineField({
      name: 'message',
      title: 'Public message',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required().min(10).max(500),
    }),
    defineField({
      name: 'href',
      title: 'Optional website path or URL',
      type: 'string',
      description: 'Use an SSKEMS path such as /admissions or an approved https URL.',
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
      title: 'Valid from, newest first',
      name: 'validFromDesc',
      by: [{field: 'publication.validFrom', direction: 'desc'}],
    },
  ],
  preview: {
    select: {
      title: 'title',
      state: 'publication.state',
    },
    prepare({title, state}) {
      return {title, subtitle: state ? `Publication: ${state}` : 'Publication not configured'}
    },
  },
})
