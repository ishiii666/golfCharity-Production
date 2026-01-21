/**
 * Shared charity data used across the application
 * This ensures consistency between Charities page and MyCharity page
 */

export const allCharities = [
    {
        id: '1',
        name: 'Beyond Blue',
        category: 'Mental Health',
        description: 'Supporting Australians affected by anxiety, depression and suicide through practical support and connection.',
        image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&h=400&fit=crop',
        totalRaised: 45230,
        supporters: 412,
        location: 'National',
        featured: true
    },
    {
        id: '2',
        name: 'Cancer Council',
        category: 'Health Research',
        description: 'Funding research, prevention programs and support services for all Australians affected by cancer.',
        image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&h=400&fit=crop',
        totalRaised: 38750,
        supporters: 356,
        location: 'National',
        featured: true
    },
    {
        id: '3',
        name: 'Salvation Army',
        category: 'Community Support',
        description: 'Providing emergency relief, housing support and community programs for Australians in need.',
        image: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&h=400&fit=crop',
        totalRaised: 52100,
        supporters: 489,
        location: 'National',
        featured: false
    },
    {
        id: '4',
        name: "Starlight Children's Foundation",
        category: 'Children',
        description: "Brightening the lives of seriously ill children and their families throughout Australia.",
        image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&h=400&fit=crop',
        totalRaised: 29800,
        supporters: 267,
        location: 'National',
        featured: true
    },
    {
        id: '5',
        name: 'Surf Life Saving Australia',
        category: 'Community Safety',
        description: 'Keeping Australian beaches safe and providing vital rescue and emergency services.',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop',
        totalRaised: 18500,
        supporters: 198,
        location: 'Coastal',
        featured: false
    },
    {
        id: '6',
        name: 'Guide Dogs Australia',
        category: 'Disability Support',
        description: 'Providing life-changing services and Guide Dogs to Australians who are blind or have low vision.',
        image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=400&fit=crop',
        totalRaised: 22100,
        supporters: 234,
        location: 'National',
        featured: false
    },
    {
        id: '7',
        name: 'Red Cross Australia',
        category: 'Humanitarian',
        description: 'Providing humanitarian services including disaster relief, blood services, and community support.',
        image: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&h=400&fit=crop',
        totalRaised: 61200,
        supporters: 523,
        location: 'National',
        featured: true
    },
    {
        id: '8',
        name: 'RSPCA',
        category: 'Animal Welfare',
        description: 'Preventing cruelty to animals by actively promoting their care and protection across Australia.',
        image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=600&h=400&fit=crop',
        totalRaised: 33400,
        supporters: 445,
        location: 'National',
        featured: false
    },
    {
        id: '9',
        name: 'Headspace',
        category: 'Mental Health',
        description: 'Providing early intervention mental health services to young people aged 12-25.',
        image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=400&fit=crop',
        totalRaised: 27600,
        supporters: 312,
        location: 'National',
        featured: false
    },
    {
        id: '10',
        name: 'WWF Australia',
        category: 'Environment',
        description: 'Protecting Australian wildlife and natural habitats for future generations.',
        image: 'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=600&h=400&fit=crop',
        totalRaised: 41800,
        supporters: 378,
        location: 'National',
        featured: true
    },
    {
        id: '11',
        name: 'OzHarvest',
        category: 'Community Support',
        description: 'Rescuing surplus food and delivering it to charities supporting people in need.',
        image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=400&fit=crop',
        totalRaised: 35200,
        supporters: 298,
        location: 'National',
        featured: false
    },
    {
        id: '12',
        name: 'Heart Foundation',
        category: 'Health Research',
        description: 'Funding research and promoting heart health to reduce death and disability from heart disease.',
        image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=600&h=400&fit=crop',
        totalRaised: 44100,
        supporters: 401,
        location: 'National',
        featured: false
    }
];

// Get unique categories from data
export const categories = ['All', ...new Set(allCharities.map(c => c.category))];

// Get a charity by ID
export const getCharityById = (id) => allCharities.find(c => c.id === String(id));

export default allCharities;
