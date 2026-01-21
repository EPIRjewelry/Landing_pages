import React, { useState, useEffect } from 'react';
import { Menu, X, Gem, Hammer, Fingerprint, Instagram, Facebook, Twitter, ArrowRight } from 'lucide-react';

/**
 * EPIR Art Jewellery & Gemstone - Official Landing Page Component
 * Wersja: 2.0 (React/Hydrogen Ready)
 * Autor: Dyrektor Kreatywny & Marketingowy
 */

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Efekt dla nawigacji przy scrollowaniu
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="font-sans text-gray-800 bg-[#F9F9F7] min-h-screen flex flex-col">
      
      {/* --- HEADER --- */}
      <header 
        className={`fixed w-full z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm py-3' : 'bg-transparent py-6'
        }`}
      >
        <div className="container mx-auto px-6 flex justify-between items-center">
          {/* Logo */}
          <a href="#" className="group">
            <h1 className={`text-2xl font-serif font-bold tracking-widest transition-colors ${scrolled ? 'text-[#1A2F23]' : 'text-white'}`}>
              EPIR
            </h1>
            <span className={`block text-[0.65rem] font-sans tracking-[0.2em] font-light mt-1 transition-colors ${scrolled ? 'text-gray-500' : 'text-gray-300'}`}>
              ART JEWELLERY
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className={`hidden md:flex space-x-8 items-center text-sm uppercase tracking-widest ${scrolled ? 'text-gray-800' : 'text-white'}`}>
            <a href="#kolekcje" className="hover:text-[#D4AF37] transition-colors">Kolekcje</a>
            <a href="#bespoke" className="hover:text-[#D4AF37] transition-colors">Bespoke</a>
            <a href="#o-nas" className="hover:text-[#D4AF37] transition-colors">O Pracowni</a>
            
            <a 
              href="#kontakt" 
              className={`border px-6 py-2 transition-all duration-300 ${
                scrolled 
                  ? 'border-[#1A2F23] hover:bg-[#1A2F23] hover:text-white' 
                  : 'border-white hover:bg-white hover:text-[#1A2F23]'
              }`}
            >
              Umów spotkanie
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button onClick={toggleMenu} className={`md:hidden ${scrolled ? 'text-[#1A2F23]' : 'text-white'}`}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 w-full bg-white shadow-lg py-8 px-6 flex flex-col space-y-4 md:hidden text-center">
            <a href="#kolekcje" onClick={toggleMenu} className="text-[#1A2F23] uppercase tracking-widest hover:text-[#D4AF37]">Kolekcje</a>
            <a href="#bespoke" onClick={toggleMenu} className="text-[#1A2F23] uppercase tracking-widest hover:text-[#D4AF37]">Bespoke</a>
            <a href="#o-nas" onClick={toggleMenu} className="text-[#1A2F23] uppercase tracking-widest hover:text-[#D4AF37]">O Pracowni</a>
            <a href="#kontakt" onClick={toggleMenu} className="bg-[#1A2F23] text-white py-3 uppercase tracking-widest">Umów spotkanie</a>
          </div>
        )}
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=2070&auto=format&fit=crop" 
            alt="Makrofotografia pierścionka EPIR" 
            className="w-full h-full object-cover"
          />
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-[#1A2F23]/40"></div>
        </div>

        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto mt-16 animate-fade-in-up">
          <h2 className="text-xs md:text-sm uppercase tracking-[0.3em] mb-6 text-[#F3E5AB]">
            Wrocławska Pracownia Jubilerska
          </h2>
          <h1 className="text-5xl md:text-7xl font-serif mb-8 leading-tight">
            Sztuka Natury <br /> 
            <span className="italic font-light opacity-90">Zaklęta w Metalu</span>
          </h1>
          <p className="text-lg md:text-xl font-light mb-12 max-w-2xl mx-auto text-gray-100/90 leading-relaxed">
            Odkryj biżuterię, która opowiada historię. Od organicznych form "Gałązek" po surową elegancję "Kory Drzew". 
            Tworzona ręcznie i cyfrowo – specjalnie dla Ciebie.
          </p>
          <div className="flex flex-col md:flex-row gap-6 justify-center">
            <a href="#kolekcje" className="bg-[#D4AF37] text-[#1A2F23] px-10 py-4 text-sm uppercase tracking-widest font-bold hover:bg-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
              Zobacz Kolekcje
            </a>
            <a href="#bespoke" className="border border-white text-white px-10 py-4 text-sm uppercase tracking-widest hover:bg-white hover:text-[#1A2F23] transition-all duration-300">
              Zaprojektuj Własny
            </a>
          </div>
        </div>
      </section>

      {/* --- ABOUT / PHILOSOPHY --- */}
      <section id="o-nas" className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="relative z-10 overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1596903254922-3837965b262a?q=80&w=2070&auto=format&fit=crop" 
                  alt="Ręczne rzeźbienie w wosku" 
                  className="w-full h-auto hover:scale-105 transition-transform duration-700"
                />
              </div>
              {/* Decorative accent */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#F3E5AB] -z-0 hidden md:block"></div>
            </div>
            
            <div className="order-1 md:order-2">
              <span className="text-[#D4AF37] text-xs uppercase tracking-[0.2em] font-bold mb-4 block">Filozofia Marki</span>
              <h2 className="text-4xl md:text-5xl font-serif text-[#1A2F23] mb-8 leading-tight">
                Tradycja spotyka <br/><span className="italic">Technologię</span>
              </h2>
              <p className="text-gray-600 mb-6 font-light leading-relaxed text-lg">
                W EPIR nie wybieramy między starym a nowym. Łączymy je. Każdy projekt zaczyna się od wizji. Czasem jest to ręczne rzeźbienie w wosku jubilerskim, by oddać nieregularność natury w kolekcji <span className="font-serif italic text-[#1A2F23]">Gałązki</span>.
              </p>
              <p className="text-gray-600 mb-10 font-light leading-relaxed text-lg">
                Innym razem wykorzystujemy zaawansowane modelowanie 3D, by osiągnąć perfekcyjną symetrię dla oprawy rzadkich szafirów czy turmalinów.
              </p>
              
              <ul className="space-y-6">
                <li className="flex items-start">
                  <Gem className="w-6 h-6 text-[#D4AF37] mr-4 mt-1" />
                  <div>
                    <h4 className="font-serif text-[#1A2F23] text-lg">Gemmologia</h4>
                    <p className="text-sm text-gray-500 font-light">Ekspercka selekcja unikalnych kamieni.</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Hammer className="w-6 h-6 text-[#D4AF37] mr-4 mt-1" />
                  <div>
                    <h4 className="font-serif text-[#1A2F23] text-lg">Rzemiosło</h4>
                    <p className="text-sm text-gray-500 font-light">Autorska pracownia we Wrocławiu.</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <Fingerprint className="w-6 h-6 text-[#D4AF37] mr-4 mt-1" />
                  <div>
                    <h4 className="font-serif text-[#1A2F23] text-lg">Unikalność</h4>
                    <p className="text-sm text-gray-500 font-light">Projekty "Bespoke" na indywidualne zamówienie.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* --- COLLECTIONS --- */}
      <section id="kolekcje" className="py-24 bg-[#1A2F23] text-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-serif mb-6">Nasze Światy</h2>
            <p className="font-light text-gray-300 max-w-2xl mx-auto text-lg">
              Biżuteria inspirowana naturą, sztuką i emocjami. Wybierz swoją historię.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Collection 1 */}
            <div className="group cursor-pointer">
              <div className="aspect-[3/4] overflow-hidden bg-gray-800 mb-6 relative">
                 <img 
                   src="https://images.unsplash.com/photo-1603561596112-0a132b72231d?q=80&w=2070&auto=format&fit=crop" 
                   alt="Kolekcja Gałązki" 
                   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                 />
                 <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
              </div>
              <h3 className="text-3xl font-serif text-[#D4AF37] mb-2 group-hover:translate-x-2 transition-transform">Gałązki</h3>
              <p className="text-gray-400 font-light text-sm leading-relaxed mb-4">
                Subtelne, splecione formy inspirowane leśnym poszyciem. Organiczna nieregularność dla romantycznych dusz.
              </p>
              <span className="flex items-center text-xs uppercase tracking-widest text-white group-hover:text-[#D4AF37] transition-colors">
                Odkryj <ArrowRight className="w-4 h-4 ml-2" />
              </span>
            </div>

            {/* Collection 2 */}
            <div className="group cursor-pointer mt-0 md:-mt-12">
              <div className="aspect-[3/4] overflow-hidden bg-gray-800 mb-6 relative">
                 <img 
                   src="https://images.unsplash.com/photo-1615655114865-4cc1bda5901e?q=80&w=1974&auto=format&fit=crop" 
                   alt="Kolekcja Kora Drzew" 
                   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                 />
                 <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
              </div>
              <h3 className="text-3xl font-serif text-[#D4AF37] mb-2 group-hover:translate-x-2 transition-transform">Kora Drzew</h3>
              <p className="text-gray-400 font-light text-sm leading-relaxed mb-4">
                Surowe, męskie i damskie formy o unikalnej fakturze. Symbol trwałości, siły i naturalnego piękna.
              </p>
              <span className="flex items-center text-xs uppercase tracking-widest text-white group-hover:text-[#D4AF37] transition-colors">
                Odkryj <ArrowRight className="w-4 h-4 ml-2" />
              </span>
            </div>

            {/* Collection 3 */}
            <div className="group cursor-pointer">
              <div className="aspect-[3/4] overflow-hidden bg-gray-800 mb-6 relative">
                 <img 
                   src="https://images.unsplash.com/photo-1599643477877-530eb83abc8e?q=80&w=1887&auto=format&fit=crop" 
                   alt="Kolekcja Secesyjna" 
                   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                 />
                 <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
              </div>
              <h3 className="text-3xl font-serif text-[#D4AF37] mb-2 group-hover:translate-x-2 transition-transform">Secesja & Kamienie</h3>
              <p className="text-gray-400 font-light text-sm leading-relaxed mb-4">
                Płynne linie i feeria barw. Szmaragdy, Opale i Turmaliny w artystycznej, bogatej oprawie.
              </p>
              <span className="flex items-center text-xs uppercase tracking-widest text-white group-hover:text-[#D4AF37] transition-colors">
                Odkryj <ArrowRight className="w-4 h-4 ml-2" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* --- BESPOKE CTA --- */}
      <section id="bespoke" className="py-24 bg-[#F3E5AB]/20 relative">
        <div className="container mx-auto px-6">
          <div className="bg-white p-12 md:p-20 shadow-xl flex flex-col md:flex-row items-center gap-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#F3E5AB] rounded-full filter blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="w-full md:w-1/2">
               <span className="text-[#D4AF37] text-xs uppercase tracking-[0.2em] font-bold mb-4 block">Usługa Bespoke</span>
               <h2 className="text-4xl md:text-5xl font-serif text-[#1A2F23] mb-6">Biżuteria Marzeń</h2>
               <p className="text-gray-600 mb-8 font-light leading-relaxed text-lg">
                  Szukasz pierścionka zaręczynowego, który będzie tak unikalny jak Wasza miłość? W EPIR specjalizujemy się w projektach na indywidualne zamówienie.
               </p>
               <div className="flex flex-col gap-4">
                 <div className="flex items-center text-gray-700 font-light">
                    <span className="w-2 h-2 bg-[#1A2F23] rounded-full mr-4"></span>
                    Spotkanie w pracowni lub online
                 </div>
                 <div className="flex items-center text-gray-700 font-light">
                    <span className="w-2 h-2 bg-[#1A2F23] rounded-full mr-4"></span>
                    Wybór kruszcu i unikalnego kamienia
                 </div>
                 <div className="flex items-center text-gray-700 font-light">
                    <span className="w-2 h-2 bg-[#1A2F23] rounded-full mr-4"></span>
                    Projekt 3D przed realizacją
                 </div>
               </div>
               <div className="mt-10">
                 <a href="#kontakt" className="inline-block bg-[#1A2F23] text-white px-8 py-4 text-sm uppercase tracking-widest hover:bg-[#D4AF37] transition-colors duration-300">
                   Umów darmową konsultację
                 </a>
               </div>
            </div>
            
            <div className="w-full md:w-1/2 grid grid-cols-2 gap-4">
               <img src="https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=2070&auto=format&fit=crop" className="rounded shadow-lg mt-12 transform hover:scale-105 transition-transform duration-500" alt="Szkic biżuterii" />
               <img src="https://images.unsplash.com/photo-1573408301185-9146fe634ad0?q=80&w=2075&auto=format&fit=crop" className="rounded shadow-lg mb-12 transform hover:scale-105 transition-transform duration-500" alt="Gotowy pierścionek" />
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer id="kontakt" className="bg-[#2C2C2C] text-white pt-20 pb-10 mt-auto">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 border-b border-white/10 pb-12">
            <div className="md:col-span-1">
              <h3 className="font-serif text-2xl mb-6 tracking-wide text-white">EPIR</h3>
              <p className="text-gray-400 text-sm font-light leading-relaxed mb-6">
                Pracownia biżuterii artystycznej łącząca pasję, rzemiosło i nowoczesną technologię.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-[#D4AF37] transition-colors"><Instagram size={20} /></a>
                <a href="#" className="text-gray-400 hover:text-[#D4AF37] transition-colors"><Facebook size={20} /></a>
                <a href="#" className="text-gray-400 hover:text-[#D4AF37] transition-colors"><Twitter size={20} /></a>
              </div>
            </div>

            <div>
              <h4 className="text-[#D4AF37] text-xs uppercase tracking-widest mb-6">Kontakt</h4>
              <p className="text-gray-300 mb-2">Pracownia EPIR</p>
              <p className="text-gray-400 text-sm mb-4">ul. Przykładowa 12/4<br/>50-001 Wrocław</p>
              <p className="text-gray-400 text-sm"><span className="text-[#D4AF37]">Email:</span> kontakt@epir.pl</p>
            </div>

            <div>
              <h4 className="text-[#D4AF37] text-xs uppercase tracking-widest mb-6">Odkryj</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="#" className="hover:text-[#D4AF37] transition-colors">Sklep Online</a></li>
                <li><a href="#" className="hover:text-[#D4AF37] transition-colors">Kamienie Szlachetne</a></li>
                <li><a href="#" className="hover:text-[#D4AF37] transition-colors">Tabela rozmiarów</a></li>
                <li><a href="#" className="hover:text-[#D4AF37] transition-colors">Blog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[#D4AF37] text-xs uppercase tracking-widest mb-6">Newsletter</h4>
              <p className="text-gray-400 text-sm font-light mb-4">
                Nowe kolekcje i unikalne kamienie prosto na Twój email.
              </p>
              <form className="flex flex-col gap-3">
                <input 
                  type="email" 
                  placeholder="Twój email" 
                  className="bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
                />
                <button className="bg-[#D4AF37] text-[#1A2F23] px-4 py-2 text-sm uppercase tracking-widest font-bold hover:bg-white transition-colors">
                  Zapisz się
                </button>
              </form>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
            <p>&copy; 2026 EPIR Art Jewellery & Gemstone.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
               <a href="#" className="hover:text-gray-300">Prywatność</a>
               <a href="#" className="hover:text-gray-300">Regulamin</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
