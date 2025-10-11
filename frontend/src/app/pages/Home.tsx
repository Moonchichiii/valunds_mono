import { Button } from "@/shared/components/ui/Button";
import { Card, CardContent, CardFooter } from "@/shared/components/ui/Card";
import { Carousel } from "@/shared/components/ui/Carousel";
import { ArrowRight, Award, Clock, Star, Users } from "lucide-react";
import type { JSX } from "react";

export const Home = (): JSX.Element => {
  const carouselItems = [
    {
      image:
        "https://images.pexels.com/photos/5025516/pexels-photo-5025516.jpeg?auto=compress&cs=tinysrgb&w=1920",
      title: "Master Craftspeople Across All Trades",
      subtitle: "Nordic Excellence",
      description:
        "Connect with exceptional professionals from construction to tech, all embodying Nordic values of quality and craftsmanship.",
    },
    {
      image:
        "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1920",
      title: "Build Your Dream Team",
      subtitle: "Every Industry, Every Skill",
      description:
        "Find skilled workers and professionals who integrate seamlessly with your team and share your vision for excellence.",
    },
    {
      image:
        "https://images.pexels.com/photos/3862130/pexels-photo-3862130.jpeg?auto=compress&cs=tinysrgb&w=1920",
      title: "Trusted by Leading Nordic Businesses",
      subtitle: "Proven Track Record",
      description:
        "Join thousands of companies who have successfully built their teams through our marketplace.",
    },
  ];

  const professionals = [
    {
      category: "Master Electrician",
      name: "Erik Andersson",
      location: "Stockholm, Sweden",
      description:
        "Licensed electrician with 12+ years of experience in residential and commercial projects. Specialized in sustainable energy solutions.",
      status: "available",
      rating: 4.9,
      reviews: 47,
      rate: "€75/hour",
      accent: "bg-accent-blue",
      image:
        "https://images.pexels.com/photos/8961183/pexels-photo-8961183.jpeg?auto=compress&cs=tinysrgb&w=400",
    },
    {
      category: "UX/UI Designer",
      name: "Astrid Hansen",
      location: "Copenhagen, Denmark",
      description:
        "Expert in user experience design and design systems. Creates intuitive digital experiences for web and mobile applications.",
      status: "busy",
      rating: 4.8,
      reviews: 32,
      rate: "€70/hour",
      accent: "bg-accent-warm",
      image:
        "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400",
    },
    {
      category: "Carpenter & Joiner",
      name: "Lars Nordström",
      location: "Oslo, Norway",
      description:
        "Traditional woodworking craftsman specializing in custom furniture and architectural joinery. 15+ years of fine craftsmanship.",
      status: "available",
      rating: 5.0,
      reviews: 28,
      rate: "€68/hour",
      accent: "bg-accent-green",
      image:
        "https://images.pexels.com/photos/5974394/pexels-photo-5974394.jpeg?auto=compress&cs=tinysrgb&w=400",
    },
  ];

  const stats = [
    { icon: Users, value: "500+", label: "Active Professionals" },
    { icon: Award, value: "92%", label: "Client Satisfaction" },
    { icon: Clock, value: "24h", label: "Average Match Time" },
  ];

  return (
    <div className="min-h-screen bg-nordic-cream">
      {/* Hero Section with Carousel */}
      <section className="pt-0">
        <div className="w-full">
          <Carousel items={carouselItems} autoPlayInterval={6000} />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-nordic-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="grid md:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center group hover:transform hover:scale-105 transition-transform duration-300"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-primary/10 rounded-full mb-4 group-hover:bg-accent-primary/20 transition-colors duration-300">
                  <stat.icon className="w-8 h-8 text-accent-primary" />
                </div>
                <div className="text-4xl font-semibold text-text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-text-secondary font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="relative rounded-[--radius-nordic-xl] overflow-hidden shadow-[--shadow-nordic-xl]">
                <img
                  src="https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Professional collaboration"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-accent-primary/40 to-transparent" />
              </div>
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-accent-blue/20 rounded-full blur-3xl" />
            </div>

            <div>
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-nordic-warm text-text-secondary text-xs font-medium uppercase tracking-wider mb-6">
                Nordic Professional Marketplace
              </span>
              <h2 className="text-3xl lg:text-5xl font-semibold leading-tight text-text-primary mb-6 tracking-tight">
                Connect with{" "}
                <span className="bg-gradient-to-r from-accent-blue to-accent-primary bg-clip-text text-transparent">
                  master craftspeople
                </span>
              </h2>
              <p className="text-lg text-text-secondary leading-relaxed mb-8">
                Just as Völund forged legendary works with unmatched skill,
                Valunds connects Nordic businesses with exceptional
                professionals across all trades who embody the same dedication
                to craft and excellence.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-accent-green rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-text-secondary">
                    AI-powered matching using secure, privacy-first technology
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-accent-green rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-text-secondary">
                    Personal data processed locally on secure servers
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-accent-green rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="text-text-secondary">
                    Smart CV generation and form filling with local AI
                    assistance
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="group relative overflow-hidden">
                  <span className="relative z-10 flex items-center">
                    Find Professionals
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1e2d3d] to-accent-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="group relative overflow-hidden"
                >
                  <span className="relative z-10">Join as Professional</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/5 to-accent-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Professionals */}
      <section className="py-24 bg-nordic-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-semibold text-text-primary mb-4 tracking-tight">
              Featured Professionals
            </h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              From construction to tech - meet exceptional talent across all
              trades
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {professionals.map((pro) => (
              <Card
                key={pro.name}
                className="group hover:transform hover:-translate-y-2 transition-all duration-300"
              >
                <div className="relative mb-6 rounded-lg overflow-hidden">
                  <img
                    src={pro.image}
                    alt={pro.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div
                    className={`absolute top-4 right-4 w-3 h-3 rounded-full ${pro.accent}`}
                  />
                </div>

                <div className="mb-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-text-muted bg-nordic-warm px-3 py-1 rounded-full">
                    {pro.category}
                  </span>
                </div>

                <h3 className="text-2xl font-semibold text-text-primary mb-2 tracking-tight">
                  {pro.name}
                </h3>
                <p className="text-text-secondary mb-4 font-medium">
                  {pro.location}
                </p>

                <CardContent>
                  <p className="text-text-secondary leading-relaxed">
                    {pro.description}
                  </p>
                </CardContent>

                <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        pro.status === "available"
                          ? "bg-accent-green"
                          : "bg-accent-warm"
                      }`}
                    />
                    <span className="text-text-secondary">
                      {pro.status === "available"
                        ? "Available"
                        : "Next available March 2025"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-accent-warm text-accent-warm" />
                    <span className="text-text-secondary">
                      {pro.rating} ({pro.reviews})
                    </span>
                  </div>
                  <span className="font-medium text-accent-primary">
                    {pro.rate}
                  </span>
                </div>

                <CardFooter>
                  <Button className="flex-1">Contact</Button>
                  <Button variant="ghost">Portfolio</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-24 bg-nordic-warm relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-96 h-96 bg-accent-blue rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-warm rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto px-6 lg:px-12 relative z-10">
          <Card className="border-2 border-border-light">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              <img
                src="https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=400"
                alt="Magdalena Kiczek"
                className="w-24 h-24 rounded-full object-cover shadow-nordic-md"
              />
              <div className="flex-1">
                <blockquote className="text-xl lg:text-2xl leading-relaxed text-text-primary mb-6 font-light italic">
                  "Working with Valunds feels like teaming up with your own
                  crew, just in another (very cool) office. The professionals go
                  above and beyond to enhance our projects and are genuinely
                  amazing to work with."
                </blockquote>
                <div>
                  <h4 className="font-semibold text-text-primary mb-1 text-lg">
                    Magdalena Kiczek
                  </h4>
                  <p className="text-text-secondary">
                    Head of Marketing, DataFeedWatch
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-accent-primary relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Team collaboration"
            className="w-full h-full object-cover opacity-10"
          />
        </div>
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center relative z-10">
          <h2 className="text-3xl lg:text-5xl font-semibold text-white mb-6 tracking-tight">
            Ready to start your next project?
          </h2>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed max-w-2xl mx-auto">
            Join Nordic businesses who trust Valunds' AI-powered matching to
            connect them with exceptional talent - all while keeping your data
            private and secure.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="secondary"
              size="lg"
              className="bg-white text-accent-primary hover:bg-gray-100 group"
            >
              Start Your Project
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="text-white border-2 border-blue-200 hover:bg-blue-50 hover:text-accent-primary"
            >
              Browse Talent
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
