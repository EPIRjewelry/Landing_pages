import React from 'react'

export default function OrganicCollection({ collection, settings = {} }) {
  if (!collection) return null

  const displayImage = collection.moodImage?.url || collection.image?.url
  const displayAlt = collection.moodImage?.altText || collection.image?.altText || collection.title
  const displayText = collection.brandStory || collection.descriptionHtml || collection.description || ''
  const isDark = settings.theme === 'dark'
  const accentStyle = collection.accentColor ? { color: collection.accentColor } : undefined

  return (
    <section
      className={`py-12 md:py-20 ${isDark ? 'bg-stone-900 text-stone-100' : 'bg-white text-stone-900'}`}
      aria-labelledby={`collection-heading-${collection.id}`}
    >
      <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row gap-8 md:gap-16 items-center">
        <div className="w-full md:w-1/2">
          <figure className="relative overflow-hidden rounded-sm aspect-[4/5] group bg-stone-200">
            {displayImage ? (
              <img
                src={displayImage}
                alt={displayAlt}
                loading="lazy"
                className="object-cover w-full h-full transition-transform duration-[1.5s] ease-out group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-stone-300" aria-hidden="true" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          </figure>
        </div>

        <div className="w-full md:w-1/2 text-left space-y-6">
          <h2
            id={`collection-heading-${collection.id}`}
            className="text-3xl md:text-4xl font-serif tracking-wide"
          >
            Z kolekcji{' '}
            <span className="italic block mt-1" style={accentStyle}>
              {collection.title}
            </span>
          </h2>

          <div
            className="opacity-85 leading-relaxed font-light text-base md:text-lg"
            dangerouslySetInnerHTML={{ __html: displayText }}
          />

          <div className="pt-4">
            <a
              href={`/collections/${collection.handle}`}
              className="inline-flex items-center justify-center px-8 py-3 border border-current
                         hover:bg-stone-800 hover:text-white hover:border-stone-800
                         transition-all duration-300 uppercase tracking-widest text-xs font-medium"
            >
              Zobacz całą kolekcję
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
