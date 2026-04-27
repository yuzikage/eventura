"""
knowledge_base.py — Static documents that go into the RAG vector store.

These are things the chatbot should know that aren't in the database:
policies, FAQs, planning tips, process explanations.

To add new knowledge: just append a new dict to DOCUMENTS.
The vector store is rebuilt from this list on every server startup.
"""

DOCUMENTS = [

    # Cancellation and rescheduling
    {
        "id": "policy_cancellation",
        "text": (
            "Cancellation and rescheduling policy: Customers can cancel or reschedule "
            "their booking by contacting their assigned event manager directly after the "
            "booking is confirmed. There is no online cancellation button — all changes "
            "must go through the manager so the team can handle venue and vendor "
            "coordination. Customers should reach out as early as possible since last-minute "
            "cancellations may affect deposit refunds depending on how close the event date is. "
            "Pending bookings that have not yet been confirmed by a manager can be discussed "
            "during the scheduled manager meeting."
        ),
    },

    # What happens after booking submission
    {
        "id": "policy_after_booking",
        "text": (
            "What happens after you submit a booking: Once you submit your booking through "
            "the event planner, you receive a booking reference number starting with EVT-. "
            "Your booking status starts as 'pending'. An event manager will review your "
            "selections and either confirm the booking or reach out if there are any issues. "
            "The manager meeting you scheduled during the booking process is your main "
            "touchpoint — bring any questions about customisation, special requirements, "
            "or adjustments to that meeting. After the manager confirms, your status changes "
            "to 'confirmed' and planning begins in earnest."
        ),
    },

    # Manager meeting — what to prepare
    {
        "id": "faq_manager_meeting",
        "text": (
            "What to prepare for your manager meeting: The manager meeting is a consultation "
            "session where you discuss your event in detail. Come prepared with a rough idea "
            "of your timeline, any special decoration requests not covered by the theme, "
            "dietary restrictions for catering, whether you need a stage or audio setup, "
            "and any vendor contacts you already have. If you have a mood board or inspiration "
            "pictures, bring those too. The manager will walk you through what is included in "
            "your selected packages and what can be customised."
        ),
    },

    # Outdoor events and monsoon
    {
        "id": "tip_outdoor_monsoon",
        "text": (
            "Tips for outdoor events in Coochbehar: Coochbehar experiences heavy monsoon "
            "rainfall from June through September. If you are planning an outdoor event "
            "during these months, always discuss a weather backup plan with your manager — "
            "most venues can arrange marquees or shift to an indoor space. Morning slots "
            "(before noon) tend to have lower rainfall risk in monsoon months. October "
            "through February is the ideal season for outdoor events — dry, cooler temperatures "
            "and minimal rain risk. For evening outdoor events, confirm lighting arrangements "
            "with the venue in advance."
        ),
    },

    # Wedding planning timeline
    {
        "id": "tip_wedding_timeline",
        "text": (
            "Wedding planning timeline and checklist: Ideally book at least 3 to 6 months "
            "in advance for weddings, especially for peak season (October to February). "
            "Key things to confirm during the manager meeting: the ceremony and reception "
            "timeline, whether the venue allows outside vendors, mehendi and sangeet "
            "arrangements if applicable, bridal suite availability, and parking for guests. "
            "Guest count finalisation matters most for catering — the caterer needs a "
            "confirmed headcount at least 2 weeks before the event. For large weddings "
            "over 300 guests, ask the manager about additional coordinator support."
        ),
    },

    # Birthday parties
    {
        "id": "tip_birthday",
        "text": (
            "Planning a birthday party with Eventura: Birthday packages work well for "
            "intimate gatherings of 20 people up to large celebrations of 500 plus. "
            "For milestone birthdays (18th, 21st, 50th), consider upgrading to the Premium "
            "or Luxury event package for enhanced decor. If children will be attending, "
            "mention this to the manager so the catering can include kid-friendly options. "
            "For surprise parties, the manager can help coordinate arrival timing so the "
            "guest of honour is not tipped off. Evening slots are most popular for adult "
            "birthday parties — book early if you have a specific date in mind."
        ),
    },

    # Corporate events
    {
        "id": "tip_corporate",
        "text": (
            "Corporate event planning: For corporate events, Eventura can accommodate "
            "conferences, product launches, team offsites, and client dinners. Key things "
            "to confirm with the manager: whether you need AV equipment and projector setup, "
            "whether the venue has reliable WiFi, whether you need a podium or stage, "
            "and whether the catering should be a sit-down meal or a working-lunch buffet. "
            "Corporate clients often require a GST invoice — request this from the manager "
            "at the time of booking. For events requiring NDAs or confidentiality, the "
            "manager can arrange restricted access to the venue."
        ),
    },

    # How catering pricing works
    {
        "id": "faq_catering_pricing",
        "text": (
            "How catering pricing works: Catering packages at Eventura are priced per head, "
            "meaning the cost scales with your guest count. To calculate your total catering "
            "cost, multiply the package's price per person by your guest count. For example, "
            "if the Standard package is ₹350 per head and you have 100 guests, the catering "
            "cost is ₹35,000. You will see this calculation live in the booking wizard as "
            "you adjust your guest count. The catering price covers food service for the "
            "event duration. If you need welcome drinks, pre-event snacks, or a late-night "
            "snack station, discuss these as add-ons with the manager."
        ),
    },

    # Last-minute bookings
    {
        "id": "faq_last_minute",
        "text": (
            "Last-minute bookings: Eventura does accept last-minute bookings subject to "
            "venue availability. If your event is within 2 weeks, complete the booking "
            "form as normal and mark your preferred meeting date as the earliest available. "
            "The manager will prioritise reviewing urgent bookings. Note that some "
            "customisations may not be possible on short notice, and catering headcount "
            "changes within one week of the event may be limited. For same-week events, "
            "call the office directly rather than waiting for the online confirmation process."
        ),
    },

    # Custom requirements
    {
        "id": "faq_custom",
        "text": (
            "Custom and special requirements: The packages listed in the booking wizard "
            "are starting points, not rigid limits. Many customers have specific needs — "
            "a particular flower arrangement, a specific cuisine not in the standard menu, "
            "live music, a photo booth, or a themed cake. These can all be discussed and "
            "arranged during the manager meeting. Eventura works with a network of trusted "
            "local vendors for services outside the standard packages. Custom requests may "
            "affect the final cost, which the manager will confirm before anything is finalised."
        ),
    },

    # General FAQ
    {
        "id": "faq_general",
        "text": (
            "Frequently asked questions about Eventura: "
            "Q: Can I visit the venue before booking? A: Yes, contact the manager after "
            "submitting your booking to arrange a site visit. "
            "Q: Is parking available? A: Most venues have parking — confirm capacity with "
            "the manager for large guest counts. "
            "Q: Can I bring my own decorator? A: Yes, outside vendors are generally allowed, "
            "discuss this with the manager. "
            "Q: Is there a minimum guest count? A: No formal minimum, but some packages "
            "are better suited to larger groups — the manager can advise. "
            "Q: Do you handle destination events outside Coochbehar? A: Currently Eventura "
            "operates within Coochbehar district only."
        ),
    },
    # Pricing and payment
    {
        "id": "faq_payment",
        "text": (
            "Payment and deposit information: Eventura does not process payments "
            "through this website. Payment terms are discussed and confirmed during "
            "the manager consultation meeting after your booking is approved. "
            "Typically a deposit is required to secure your event date, with the "
            "balance due closer to the event. The exact deposit amount and payment "
            "schedule will be outlined by your event manager in writing before you "
            "are asked to pay anything. All payments are made directly to Eventura "
            "through channels confirmed by the manager — do not transfer money to "
            "any unverified contact."
        ),
    },
 
    # What the meeting date vs event date means
    {
        "id": "faq_two_dates",
        "text": (
            "Understanding your two booking dates: When you book with Eventura, "
            "you select two separate dates. The meeting date is your consultation "
            "appointment with the event manager — this is when you discuss details, "
            "finalise customisations, and confirm the full plan. The event date is "
            "the actual day your event takes place at the venue. These two dates "
            "are independent: your consultation meeting typically happens weeks or "
            "months before the event itself. Multiple customers can schedule "
            "consultations on the same day — there is no conflict. However, only "
            "one event can be booked at any given venue on any given event date."
        ),
    },
 
    # Decoration and customisation
    {
        "id": "faq_decoration",
        "text": (
            "Decoration and theme customisation: The theme you select in the booking "
            "wizard sets the overall visual direction — colour palette, floral style, "
            "lighting mood, and table arrangements. However, everything within the "
            "theme can be customised during your manager meeting. If you want specific "
            "flowers, a particular colour variation, additional lighting effects, a "
            "custom backdrop, or personalised signage, bring those requests to the "
            "meeting. The event package you choose determines the base level of decor "
            "— higher tier packages include more elements. Additions beyond the "
            "package are quoted separately by the manager."
        ),
    },
 
    # Venue visit
    {
        "id": "faq_venue_visit",
        "text": (
            "How to visit a venue before booking: You can request a venue visit "
            "after submitting your booking. Once your booking is under review, "
            "contact your assigned event manager and ask to schedule a site visit. "
            "Site visits are typically arranged during weekday business hours. "
            "Bring your guest count estimate and any layout requirements so the "
            "manager can walk you through seating arrangements, stage placement, "
            "and entry points. You do not need to visit before booking — the "
            "consultation meeting often serves the same purpose for customers "
            "who are familiar with the venue."
        ),
    },
 
    # Difference between packages
    {
        "id": "faq_package_differences",
        "text": (
            "How to choose between Basic, Premium, and Luxury event packages: "
            "The Basic package is ideal for smaller gatherings or events where "
            "decor is not the centrepiece — it includes standard florals and one "
            "coordinator for up to 8 hours. The Premium package suits most weddings "
            "and milestone celebrations — it adds upgraded floral arrangements, "
            "two coordinators, and extended duration. The Luxury package is for "
            "events where presentation is paramount — it includes premium florals, "
            "full styling, multiple coordinators, and priority vendor access. "
            "If you are unsure, the Premium package is the most popular choice "
            "for weddings. The manager can advise based on your specific event "
            "during the consultation."
        ),
    },
 
    # Corporate events specifically
    {
        "id": "faq_corporate_specific",
        "text": (
            "Corporate event logistics at Eventura: For corporate clients, "
            "Eventura handles everything from product launches to annual dinners. "
            "Key things to confirm with your manager: AV setup and projector "
            "requirements, branded signage or step-and-repeat banners, whether "
            "you need breakout rooms or a single hall, dress code for staff, "
            "and whether the event requires a strict agenda or is more casual. "
            "Corporate bookings often require a formal invoice with GST for "
            "company reimbursement — request this from the manager at booking time. "
            "For confidential events such as investor meetings or product reveals, "
            "the manager can arrange NDAs with vendors and restrict venue access "
            "to invited attendees only."
        ),
    },
 
    # Children's events
    {
        "id": "faq_childrens_events",
        "text": (
            "Children's parties and family events: Eventura can host birthday "
            "parties, baby showers, and family celebrations with children attending. "
            "When you book, mention in the meeting notes that children will be "
            "present so the manager can advise on child-safe decor (no sharp "
            "floral pins, no low candles), a dedicated kids' activity area if "
            "needed, and kid-friendly menu options from the catering team. "
            "For parties where children are the primary guests (e.g. a child's "
            "birthday), the Basic or Premium package typically works well. "
            "Ask the manager about entertainment add-ons such as a photo booth, "
            "games area, or themed cake service."
        ),
    },
 
    # What if something goes wrong
    {
        "id": "faq_issues",
        "text": (
            "What to do if something goes wrong on the event day: Your event "
            "manager is your primary point of contact throughout the day. "
            "They will be on-site or reachable by phone from venue setup through "
            "to event close. If a vendor is late, a decoration does not arrive, "
            "or something is not as agreed, contact your manager immediately — "
            "do not try to resolve vendor issues directly. Eventura takes "
            "responsibility for coordinating all vendors booked through the "
            "platform. For issues discovered after the event, contact Eventura "
            "within 48 hours with photos or documentation and the team will "
            "follow up with the relevant vendor."
        ),
    },
]
