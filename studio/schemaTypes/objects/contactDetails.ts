import {defineField, defineType} from 'sanity'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const contactDetails = defineType({
  name: 'contactDetails',
  title: 'Official public contact',
  type: 'object',
  description: 'Institutional contact channels intended for public display.',
  fields: [
    defineField({
      name: 'location',
      title: 'Public location',
      type: 'string',
      description: 'Public postal or campus location as it should appear on the website.',
      validation: (rule) => rule.required().max(300),
    }),
    defineField({
      name: 'phone',
      title: 'Office phone',
      type: 'string',
      validation: (rule) => rule.required().min(7).max(24),
    }),
    defineField({
      name: 'mobile',
      title: 'Public mobile number',
      type: 'string',
      validation: (rule) => rule.min(7).max(24),
    }),
    defineField({
      name: 'email',
      title: 'General email',
      type: 'string',
      validation: (rule) =>
        rule.required().custom((value) =>
          !value || emailPattern.test(value) ? true : 'Enter a valid public email address.',
        ),
    }),
    defineField({
      name: 'principalEmail',
      title: 'Principal office email',
      type: 'string',
      description: 'Use an institutional public address, never a private personal address.',
      validation: (rule) =>
        rule.custom((value) =>
          !value || emailPattern.test(value) ? true : 'Enter a valid public email address.',
        ),
    }),
    defineField({
      name: 'workingHours',
      title: 'Working hours',
      type: 'object',
      fields: [
        defineField({
          name: 'weekdays',
          title: 'Weekdays',
          type: 'string',
          description: 'For example: Monday–Friday, 9:00 am–4:00 pm.',
          validation: (rule) => rule.max(120),
        }),
        defineField({
          name: 'saturday',
          title: 'Saturday',
          type: 'string',
          description: 'For example: 9:00 am–1:00 pm or Closed.',
          validation: (rule) => rule.max(120),
        }),
      ],
    }),
  ],
})
