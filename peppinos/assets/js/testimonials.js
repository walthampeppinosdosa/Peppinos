/**
 * Testimonial Modal Functionality
 * Handles the display of full testimonials in modal dialogs
 */

// Full testimonial data
const testimonialData = {
  1: {
    name: "Elongen Jones",
    meta: "Local Guide • 135 reviews • 163 photos • a month ago",
    review: "Amazing food. The best restaurant I've been to since moving here four years ago. The samosa were flaky with some stiffness, freshly made, and nice portion size. The flavor and the seasoning of the dish were so impressive. The staff were very knowledge about the dishes and how they are served in India. Savio, our server, gave us great recommendations, and the different spice levels paired with the variety of dishes. If you are in the area, definitely check them out. You will not be disappointed."
  },
  2: {
    name: "Amy Patel",
    meta: "Local Guide • 62 reviews • 194 photos • 2 months ago",
    review: "My husband and I love the food here. We have been visiting this restaurant for the last 3+ years and the food has been consistently good. I highly recommend this place for the vegetarian dished- miloni tarkari (the best!), multani paneer, saag, kalonji baingan, and tandoori roti are all tried and loved by us. The recently started a non-vegetarian menu, and we tried it today - laal maas. I tried a new vegetarian dish- kolahpuri paneer (it was ok, nothing special). The staff and our server Savio were very helpful and pleasant to talk to."
  },
  3: {
    name: "Verified Customer",
    meta: "6 months ago • Dine in • Dinner • $50–100",
    review: "If you're looking for a true culinary journey through India, this restaurant delivers an exceptional experience. From the moment you walk in, you're welcomed by the warm, inviting atmosphere that immediately sets the tone for an unforgettable meal. This restaurant recently opened their separate non veg section with separate kitchen and sitting. This is so thoughtful. The menu is a beautiful fusion of traditional and innovative dishes, each bursting with vibrant flavors and expertly balanced spices. Every dish is meticulously prepared, using fresh, high-quality ingredients that elevate even the simplest meals. The butter chicken is a standout – rich, creamy, and perfectly spiced, it's the ideal introduction to Indian cuisine. Equally impressive is the tandoori fish, which is delicious and packed with complex flavors."
  },
  4: {
    name: "Divya Prajapati",
    meta: "3 reviews • 3 photos • a month ago",
    review: "We had a great experience at the restaurant, thanks to Savio and Sanket! Their service was excellent very attentive, polite, and professional. They made us feel welcome, gave us great suggestions, and ensured we had everything we needed throughout our meal. Their friendly attitude really added to the overall experience. Highly recommend visiting and being served by them!"
  },
  5: {
    name: "Finding Jeffrey",
    meta: "Local Guide • 38 reviews • 49 photos • 5 months ago",
    review: "What a gem on Moody Street in Waltham! Peppino's Dosa is a unique spot with separate Vegan and Meat sections, making it super accommodating for different diets. The food and service are both top-notch, and the portions are generous and satisfying. We started with Peppino's Platter—a perfect sampler if you're new to this type of cuisine. It included Samosa, Aloo Tikki, Veg Pakora, and Paneer Pakora—each one flavorful and perfectly cooked. Next up was the Peshawari Naan, a sweet, nutty flatbread stuffed with coconut, raisins, and nuts. It was absolutely delicious and a great contrast to the spicier dishes."
  }
};

/**
 * Opens the testimonial modal with the specified testimonial data
 * @param {number} testimonialId - The ID of the testimonial to display
 */
function openTestimonialModal(testimonialId) {
  const modal = document.getElementById('testimonialModal');
  const data = testimonialData[testimonialId];
  
  if (!data || !modal) {
    console.error('Testimonial data or modal not found');
    return;
  }
  
  // Populate modal content
  document.getElementById('modalCustomerName').textContent = data.name;
  document.getElementById('modalCustomerMeta').textContent = data.meta;
  document.getElementById('modalReviewText').textContent = `"${data.review}"`;
  
  // Show modal
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
  
  // Add click outside to close functionality
  modal.onclick = function(event) {
    if (event.target === modal) {
      closeTestimonialModal();
    }
  };
}

/**
 * Closes the testimonial modal
 */
function closeTestimonialModal() {
  const modal = document.getElementById('testimonialModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
  }
}

/**
 * Initialize testimonial modal functionality
 */
function initTestimonialModal() {
  // Add escape key listener
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      closeTestimonialModal();
    }
  });
  
  // Ensure modal is hidden on page load
  const modal = document.getElementById('testimonialModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initTestimonialModal);
