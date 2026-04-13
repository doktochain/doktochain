import React from 'react'

export default function SectionHeading({title}: {title:string}) {
  return (
    <h1 className="text-3xl font-bold text-gray-900 text-left mb-2
                  dark:text-white">
          {title}
    </h1>
  )
}
