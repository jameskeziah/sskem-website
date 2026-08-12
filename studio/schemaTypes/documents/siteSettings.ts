import {defineField, defineType} from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings and contact',
  type: 'document',
  description: 'Official institutional contact details intended for public display.',
  fields: [
    defineField({
      name: 'contact',
      title: 'Official public contact',
      type: 'contactDetails',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publication',
      title: 'Publication control',
      type: 'publication',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      email: 'contact.email',
    },
    prepare({email}) {
      return {title: 'Site settings and contact', subtitle: email || 'Contact email not set'}
    },
  },
})
