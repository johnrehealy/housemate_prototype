# Housemate Product

## Vision

Housemate is a home-management product. A homeowner delegates repairs, services, errands, scheduling, and follow-up to an agent, and can see, understand, and correct what the agent did. Housemate owns orchestration, organization, and the home's memory and context. The goal is seamless collaboration between agent and human.

## Channels

- **SMS/RCS/MMS is the primary channel.** Twilio is the current provider.
- **The web app is the trusted control surface** for transcripts, structured records, corrections, and status. Users can also do everything there if they prefer it to texting.
- **Everything stays in sync.** Anything that happens in a text conversation updates the web app in real time.
- **Channels are interchangeable.** SMS, web, and future channels use the same application actions and the same data. Provider choices may change; product rules and data ownership don't.

## App areas

The app has six areas.

### Chat

Start a new conversation with the agent, or browse past conversations and the files and documents shared in them. Mirrors the SMS thread in real time.

### To Do

The current list of items that need the user's action, items shared for awareness, and recently completed items.

### Schedule

A calendar with month, week, and day views showing upcoming services, agent actions, reminders, and personal items.

### Services

The home's rolodex of service providers and vendors. A provider is **active** if used within the past year and **inactive** otherwise.

### Errands

Where users request pickups and dropoffs, such as returns and dry cleaning. A Housemate team member visits the home weekly to handle them.

### Property

A full inventory of the home's assets, grouped into Appliances, Electronics, Paint, Lighting, Safety, and Structure.

## The agent

Housemate's agent is Claude, running on the server.

### What it knows

- Everything in Housemate's own records: conversations, To Do, Schedule, Services, Errands, Property, and attachments.
- Members are real users with real data. Every home starts empty and fills up through use.
- The eventual product adds connectors to the member's inbox, email and calendars. The prototype has none.

### What it can do

- Change anything in Housemate's records, through the same application actions the web app uses.
- Act on its own, with one exception: **anything that involves or could involve a payment**, including fees such as deposits, cancellation fees or accepting a quote. For those, it says what it will cost and waits for a clear yes.
- Pay on the member's behalf once they confirm, using Stripe.

### Contacting vendors

- The agent contacts vendors itself wherever it can, including using computer use to book appointments on vendor websites. This applies to the prototype too, which uses real vendor sites.
- When it can't, it gives the member everything needed to do it directly: what to ask for, contact details, and direct links.
- For now, if a vendor site needs an account, a login or a CAPTCHA, the agent hands that step to the member with the link and what to book.

### Conversations

- Each member has one continuous SMS thread. The agent sorts each text into an open conversation by topic, or starts a new one. In the web app, a member can move a message to a different conversation.
- Correcting a record in the web app doesn't send a text.

### Texting first

The agent mostly replies. It texts unprompted only to:

- remind the member about an upcoming appointment, or
- follow up on an important issue, such as a payment problem.

Other unprompted texts are out of scope unless approved, and every unprompted text is monitored.

### Voice

Casual and brief, like a friend texting back rather than an agent or customer service.

- **Keep texts short.** Put separate thoughts in separate texts instead of one long message.
- **Talk like a person.** Use everyday words and contractions, and greet the member by first name.
- **Acknowledge, then get practical.** A quick "sorry to hear that," then the useful part.
- **One question at a time.**
- **Give steps the way you'd text a friend:** inline, with a quick reason when it helps ("scroll to settings > restart… Sometimes a software glitch prevents the signal from reaching the thermostat").
- **Say what you checked in one sentence,** without narrating the process.
- **No formatting or corporate phrasing:** no bullet lists or headings, and nothing like "I'd be happy to assist."

Reference thread, for tone:

> **John:** Hey - my house is getting really warm. Thermostat says air is cooling but I don't feel anything coming out?
>
> **Housemate:** Hey John - I'm sorry to hear that. When did this start?
>
> **Housemate:** I'm not seeing any known issues or recalls relating to your thermostat model or HVAC system.
>
> **John:** I'm not sure when it started, but inside temp is 80 degrees when it is set to 72.
>
> **Housemate:** Ok let's try this - on the thermostat scroll to settings > restart. Reboot the thermostat. Wait 2 mins and see if the air kicks back on. Sometimes a software glitch prevents the signal from reaching the thermostat.
>
> **John:** Ok did that, still not working.

## Prototype scope

The prototype is a fully working version of the web app, with SMS/RCS/MMS as the primary way to interact with it. Up to 10 invited members will use it the way they'd use the product and give feedback. Every home starts empty, and each area shows a zero state until the member fills it. It's done when the agent handles these four scenarios end to end:

1. **Reminder by text.** A member asks for a reminder by text, Housemate asks for anything missing, and the reminder appears in the web app, where the member can correct it. The reminder arrives on time.
2. **AC repair.** A member reports the AC isn't working. Housemate checks the home's records, troubleshoots with the member, books a technician, and follows up afterward.
3. **Errand by text.** A member requests a pickup or dropoff by text, and it appears in Errands.
4. **Property item from a photo.** A member texts a photo, and Housemate adds the item to Property.
