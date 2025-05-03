import Layout from '../components/Layout';

export default function Contact() {
  return (
    <Layout>
      <h1 className="text-3xl my-6 text-center text-pink-500 font-bold">Contact</h1>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-12">
        {/* Contact Form */}
        <form
          className="flex-1 space-y-6"
          action="https://formspree.io/f/xblogkpk"
          method="POST"
        >
          <div className="flex gap-6">
            <div className="flex-1">
              <label className="block text-sm text-pink-500 mb-1 uppercase tracking-wide">
                Your Name
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full border-b border-gray-400 bg-transparent focus:outline-none py-1 text-black"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-pink-500 mb-1 uppercase tracking-wide">
                E-mail Address
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full border-b border-gray-400 bg-transparent focus:outline-none py-1 text-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-pink-500 mb-1 uppercase tracking-wide">
              Subject
            </label>
            <input
              type="text"
              name="subject"
              required
              className="w-full border-b border-gray-400 bg-transparent focus:outline-none py-1 text-black"
            />
          </div>

          <div>
            <label className="block text-sm text-pink-500 mb-1 uppercase tracking-wide">
              Message
            </label>
            <textarea
              name="message"
              rows="4"
              required
              className="w-full border-b border-gray-400 bg-transparent focus:outline-none py-1 text-black"
            ></textarea>
          </div>

          <div className="text-right">
            <button
              type="submit"
              className="bg-pink-300 hover:bg-pink-400 text-black font-bold py-2 px-6 rounded"
            >
              Send Message
            </button>
          </div>
        </form>

        {/* Contact Info Sidebar */}
        <div className="flex-1">
          <p className="text-lg text-gray-700 mt-2">
            <strong>Or Email</strong> <br />
            <a href="mailto:antonbosspd@gmail.com" className="text-pink-500 underline">
              antonbosspd@gmail.com
            </a>
          </p>
        </div>
      </div>
    </Layout>
  );
}
