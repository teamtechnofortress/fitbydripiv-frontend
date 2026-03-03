<template>
  <div class="min-h-screen pt-20">
    <section class="relative h-64 flex items-center justify-center overflow-hidden">
      <div
        class="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style="background-image: url('https://images.pexels.com/photos/5668772/pexels-photo-5668772.jpeg?auto=compress&cs=tinysrgb&w=1920');"
      ></div>
      <div class="absolute inset-0" style="background: linear-gradient(to bottom right, rgba(17,24,39,0.8), rgba(31,41,55,0.8));"></div>
      <div class="relative z-10 text-center text-white px-4">
        <h1 class="text-4xl md:text-5xl font-bold drop-shadow-2xl">Privacy Policy</h1>
      </div>
    </section>

    <section class="py-16 bg-white">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="max-w-none">
          <p class="text-gray-600 mb-8"><strong>Last Updated:</strong> {{ new Date().toLocaleDateString() }}</p>

          <h2 class="text-2xl font-bold text-gray-900 mt-8 mb-4">Introduction</h2>
          <p class="text-gray-700 leading-relaxed mb-6">At FitByShot, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our services.</p>

          <h2 class="text-2xl font-bold text-gray-900 mt-8 mb-4">Information We Collect</h2>
          <p class="text-gray-700 leading-relaxed mb-4">We collect information that you provide directly to us, including:</p>
          <ul class="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>Personal information (name, email, phone number)</li>
            <li>Health information relevant to your treatment</li>
            <li>Payment and billing information</li>
            <li>Communication preferences</li>
          </ul>

          <h2 class="text-2xl font-bold text-gray-900 mt-8 mb-4">How We Use Your Information</h2>
          <p class="text-gray-700 leading-relaxed mb-4">We use your information to:</p>
          <ul class="list-disc pl-6 text-gray-700 space-y-2 mb-6">
            <li>Provide and improve our services</li>
            <li>Process your orders and payments</li>
            <li>Communicate with you about your treatment</li>
            <li>Comply with legal obligations</li>
            <li>Ensure the security of our services</li>
          </ul>

          <h2 class="text-2xl font-bold text-gray-900 mt-8 mb-4">Data Security</h2>
          <p class="text-gray-700 leading-relaxed mb-6">We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>

          <h2 class="text-2xl font-bold text-gray-900 mt-8 mb-4">Your Rights</h2>
          <p class="text-gray-700 leading-relaxed mb-6">You have the right to access, update, or delete your personal information. Contact us to exercise these rights.</p>

          <h2 class="text-2xl font-bold text-gray-900 mt-8 mb-4">Contact Us</h2>
          <p class="text-gray-700 leading-relaxed">If you have questions about this Privacy Policy, please contact us at Support@FitbyShot.com.</p>
        </div>
      </div>
    </section>
  </div>
</template>

<route lang="yaml">
meta:
  layout: public
  public: true
</route>
