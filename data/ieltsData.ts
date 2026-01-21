
// Structured IELTS Topic Data for the new Logic/Formula Selection Flow

export interface TopicCategory {
    id: string;
    label: string; // Display Name (CN)
    enLabel: string; // English Label for prompts
    icon: string; // Lucide Icon Name
    color: string; // Tailwind color class (bg-blue-500)
    lightColor: string; // Light background for icon container (bg-blue-100)
    textColor: string; // Text color for icon (text-blue-600)
    p1Weight: number; // 0.0 to 1.0 (1.0 = All P1, 0.0 = All P3)
    allowPart3?: boolean; // If false, strictly no P3 questions
    keywords: string[]; // Keywords to filter questions from raw pools
    excludes?: string[]; // Keywords to EXCLUDE (e.g. Like category excludes 'Why')
    formulaIds: string[]; // Link to specific formula skeletons (Array)
}

// 2025 Sep-Dec Data Pool (Part 1)
const P1_RAW = [
    // Work & Study
    "Work: What do you like about your job?",
    "Work: When you started your job, did you find it hard?",
    "Work: Does anyone help you with your work?",
    "Work: How do you usually spend your day at work?",
    "Work: What technology do you use in your work?",
    "Work: What would help you to do your work better?",
    "Study: What do you like about the subject/subjects you study?",
    "Study: When you started your course/programme, did you find it hard?",
    "Study: Does anyone help you with your studies?",
    "Study: How do you usually spend your day when you are studying?",
    "Study: What technology do you use in your studies?",
    "Study: What would help you to study better?",
    
    // Living / Hometown
    "Living: Where do you live now?",
    "Living: Is this an interesting place to live?",
    "Living: Do you think you will live in this place in the future?",
    "Living: Do you live alone or with other people?",
    "Living: When do you spend more time at home: on weekdays or on the weekend?",
    "Living: Would you like to change anything about the place you’re living in now?",

    // Feeling Happy
    "Feeling happy: What kinds of things make you feel happy?",
    "Feeling happy: Do you prefer watching happy or sad films/movies?",
    "Feeling happy: Have you ever shared photos of your happy moments online?",
    "Feeling happy: Who do you tell first when you receive good news?",

    // Fruit and Vegetable
    "Fruit and vegetable: Is it easy to grow fruit and vegetables where you live now?",
    "Fruit and vegetable: Would/Do you enjoy growing fruit and vegetables?",
    "Fruit and vegetable: Did/Do you learn about growing fruit and vegetables at school?",
    "Fruit and vegetable: Would you ever watch TV programmes/shows about growing fruit and vegetables?",

    // Rules
    "Rules: When you were a child, did your school have a lot of rules?",
    "Rules: Did/Do you have any teachers who were/are strict about the school rules [now]?",
    "Rules: Do you think schools in your country should have more or fewer rules?",
    "Rules: Would you like to be a teacher at a school where there are no rules?",

    // Public Places
    "Public places: Do you enjoy spending time in public places?",
    "Public places: Would you ever talk to a person you don’t know in a public place?",
    "Public places: Do you ever wear headphones to listen to music when you’re in a public place?",
    "Public places: Do you think there should be more public places where you live?",

    // Museums
    "Museums: How often did you visit museums when you were a child?",
    "Museums: Is there a museum that you would like to visit in the future?",
    "Museums: Would you ever visit a museum with your friends?",
    "Museums: Do you think there should be more museums in your country?",

    // Advertisements
    "Advertisements: Do you see many advertisements on your phone or computer?",
    "Advertisements: Do you usually remember the advertisements that you see?",
    "Advertisements: Have you ever bought something because you saw an advertisement for it?",
    "Advertisements: Do you think there will be more advertisements everywhere in the future?",

    // Crowds
    "Crowds: What places in your town/city are always crowded?",
    "Crowds: How do you feel when you’re in a crowded place?",
    "Crowds: When was the last time you enjoyed being in a crowd of people?",
    "Crowds: Would you like to live somewhere where there are only a few people?",

    // Older People
    "Older people: Do you work or study with people who are older than you?",
    "Older people: Do you enjoy spending time with people who are older than you?",
    "Older people: Have you talked to someone much older than you recently?",
    "Older people: What are you looking forward to about being older?",

    // Shoes
    "Shoes: Do you prefer shoes that are comfortable, or shoes that look nice?",
    "Shoes: Do you usually buy shoes online, or from a shop/store in town?",
    "Shoes: Would you ever buy shoes just because the company that makes them is famous?",
    "Shoes: Do you have a favourite pair of shoes?",

    // Conversation
    "Conversation: What type of things do you talk about with your friends?",
    "Conversation: Do you prefer to talk to people on the phone or to meet them face-to-face?",
    "Conversation: Have you had a long conversation with someone recently?",
    "Conversation: Do you think some people talk too much?",

    // Borrowing
    "Borrowing: Have you ever borrowed a book from a friend?",
    "Borrowing: Do you mind if someone asks to borrow something from you?",
    "Borrowing: Do you think it’s all right to borrow money from friends?",
    "Borrowing: Would you let someone borrow your phone?",

    // Take a break
    "Take a break: Do you often take short breaks when you’re working or studying?",
    "Take a break: What do you usually do when you take a break?",
    "Take a break: Have you ever had a short sleep when taking a break?",
    "Take a break: How do you feel after taking a break?",

    // Things you take
    "Things you take: Do you always take your phone with you, when you go out?",
    "Things you take: How often do you take cash with you, when you go out?",
    "Things you take: Would you ever take food with you, when you go out?",
    "Things you take: Have you ever forgotten to take something important with you, when you went out?",

    // Remember things
    "Remember things: What sort of things do you find difficult to remember?",
    "Remember things: What do you do when you need to remember something important?",
    "Remember things: Did you find it easier to remember things when you were a child?",
    "Remember things: Do you think having a good memory will be important in your future job or studies?",

    // Flowers
    "Flowers: Do people often give each other flowers in your country?",
    "Flowers: Do you know anyone who really likes flowers?",
    "Flowers: Are there many flowers growing near where you live?",
    "Flowers: Have you ever taken a photo of flowers?",

    // Photos
    "Photos: How often do you take photos?",
    "Photos: Do you ever print the photos that you have taken?",
    "Photos: Do your family and friends take a lot of photos of themselves?",
    "Photos: Would you like to be a professional photographer?",

    // Saying thank you
    "Thank you: When do you usually say 'thank you' to people in daily life?",
    "Thank you: Have you ever sent a card or message to say 'thank you'?",
    "Thank you: Do people in your country say 'thank you' very often?",
    "Thank you: How do you feel when someone says 'thank you' for something you have done?",

    // Being patient
    "Being patient: How do you feel when you have to wait for something?",
    "Being patient: Are you usually a patient person?",
    "Being patient: Were you more or less patient when you were younger?",
    "Being patient: Do you need to be patient in your work or studies?",

    // Machines
    "Machines: Which machine in your home do you use most often?",
    "Machines: Have you ever used a sewing machine to make clothes?",
    "Machines: Do you read the instructions before you use a machine for the first time?",
    "Machines: What do you do when a machine in your home breaks down?",

    // Making list
    "Making list: Do you normally make a list when you go shopping?",
    "Making list: Do you find lists useful when you're working or studying?",
    "Making list: Do you prefer to use a piece of paper or your phone when making a list?",
    "Making list: Why do you think some people don't like making lists?",

    // Being busy
    "Being busy: Are you busy with your work or studies at the moment?",
    "Being busy: Is your life busier now than when you were younger?",
    "Being busy: Do you like to be busy when you're on holiday/vacation?",
    "Being busy: Which do you think is worse: being too busy, or not having enough to do?",

    // Phones
    "Phones: What do you usually use your phone for?",
    "Phones: Have you ever lost or broken your phone?",
    "Phones: Would you be happy to receive a phone as a present/gift?",
    "Phones: Do you think it's good to stop people using their phones in certain places?",

    // Doing Things Well
    "Doing things well: How do you feel when someone says that you've done something well?",
    "Doing things well: Have you told anyone recently that they did something well?",
    "Doing things well: Do you remember a teacher telling you that you'd done something really well?",
    "Doing things well: Is it important for parents to tell children when they do things well?",

    // Free Time
    "Free time: What do you like to do in your free time?",
    "Free time: Did you have more free time when you were younger?",
    "Free time: Do you think you need a lot of free time to really enjoy yourself?",
    "Free time: What would you do if you had more free time?",

    // Staying Up Late
    "Staying up late: Do you often stay up late at night?",
    "Staying up late: Did you stay up late more often when you were younger?",
    "Staying up late: What do you usually do when you stay up late?",
    "Staying up late: How do you feel the day after you have stayed up late?",

    // Cooking
    "Cooking: How often do you cook for other people?",
    "Cooking: Would you enjoy cooking for a large group of people?",
    "Cooking: Do you think working as a chef in a restaurant is a good job?",
    "Cooking: Would you like to learn more about cooking?"
];

// 2025 Sep-Dec Data Pool (Part 3)
const P3_RAW = [
    // Lost
    "How do most people usually get from one place to another in cities in your country?",
    "Do you think it was easier to get around in cities in the past than it is today?",
    "Do you think building more roads would make it easier for people to travel around in cities?",
    "Do you agree that children should learn how to read paper maps in school?",
    "What are the advantages and disadvantages of using electronic maps, such as GPS?",
    "Do you agree with the view that it is impossible to teach someone to have better map-reading skills?",
    "What are some key points in life when people have to make important decisions?",
    "Do you agree that the best way for individuals to navigate through life is to make decisions on their own?",
    "To what extent do you think culture affects the way people make decisions in life?",

    // Dinner
    "Why do some families not eat together nowadays?",
    "How often do people eat with classmates or work colleagues?",
    "What are the advantages and disadvantages of people of different ages eating together?",
    "Why is food often an important part of special occasions?",
    "What are the advantages of eating at home compared to eating in a restaurant on special occasions?",
    "Do you think the kinds of food people eat on special occasions are changing?",
    "To what extent does the cultural identity of a country depend on its food?",
    "Do you agree that traditional customs associated with meals are becoming less important in today’s world?",
    "What benefits might formal dinners between leaders bring to international relations?",

    // Good Service
    "Do you think the most expensive shops or stores usually provide the best service?",
    "Why is it that service in shops or stores is sometimes not very good?",
    "How important do you think good service is to most customers?",
    "How is dealing with customers face-to-face different from dealing with them on the phone?",
    "What personal qualities do customer service staff need in order to handle complaints well?",
    "Do you think working in customer service would be an enjoyable job?",
    "Do you think pressure from consumers can force companies to make changes?",
    "What benefits might companies get from involving consumers in decision-making about products?",
    "In what ways has the internet increased the power of consumers?",

    // Foreign Language
    "Why do people learn a foreign language?",
    "Do you agree that speaking in a foreign language is easier than reading it?",
    "Do you think it is necessary to write a foreign language well nowadays?",
    "What is the best age for children to start learning a foreign language at school?",
    "How can teachers make learning a language more interesting for students?",
    "How valuable are school trips to countries where the foreign language is spoken?",
    "What are the benefits to a child of growing up speaking more than one language?",
    "Do you agree that promoting the learning of foreign languages in schools might improve international relations?",
    "Why is it important to preserve a wide variety of languages in the world?",

    // Broke Object
    "What kinds of everyday objects do people often accidentally break?",
    "Do you agree that older people try to repair objects more often than younger people do?",
    "Do you think everyone should learn how to repair everyday objects?",
    "What types of products are usually made in factories?",
    "Which do you think are better quality: products made in factories or products made by hand?",
    "Why do some companies design products that need to be replaced regularly?",
    "Which do you think is more important for the environment: producing objects that last longer, or consuming fewer things?",
    "Do you agree that the world’s resources are being consumed too quickly?",
    "Do you think better management of the world’s resources will be crucial for the future of the planet?",

    // Apology
    "In what situations do people usually say sorry in your country?",
    "Do you agree that people often say sorry when they don’t really mean it?",
    "Why do some people find it hard to say sorry?",
    "Why is it important for people to be aware of how their behaviour affects others?",
    "Do you agree that people should show they care by actions rather than words?",
    "Do you think people can learn to be more considerate of others?",
    "Why do some people grow up to be more selfish than others?",
    "Do you think modern society encourages people to be selfish?",
    "Do you agree that if individuals put themselves first, society can actually benefit?",

    // New Activity
    "What are the benefits for people of trying new activities?",
    "Why do people often feel worried about trying new activities?",
    "What kinds of help do people usually need when trying new activities?",
    "Why are some people more willing to try dangerous activities, such as extreme sports, than others?",
    "What are the disadvantages of thinking too much about how risky a new activity might be?",
    "Do you agree that people learn more from their mistakes than from their successes?",
    "Do you agree that the risks individuals choose to take often have a negative impact on others?",
    "To what extent should governments try to limit risk-taking by their citizens?",
    "How desirable would it be to live in a society where no one takes risks?",

    // Waiting
    "What are some everyday situations when people have to wait?",
    "Why do many people really dislike waiting?",
    "Do you think adults are better at waiting than children?",
    "Do you think people had to be more patient in the past than nowadays?",
    "Is it always a good thing to be a patient person?",
    "Do you agree that people can train themselves to be more patient?",
    "Do you agree that innovation in society is mainly driven by people wanting immediate results?",
    "What negative impact might there be on a society where everyone wants new things instantly?",
    "Do you think a society based entirely on instant gratification would be a pleasant place to live?",

    // Electricity/Power
    "In what ways do people usually use electricity in their homes?",
    "Do you think electricity is too expensive nowadays?",
    "Was it difficult for people in the past to live without electricity?",
    "Do you think electric bicycles will ever replace ordinary bicycles?",
    "Which do you think is better: vehicles that use electricity or vehicles that use petrol/gas?",
    "Do you agree that it will be easy for governments to manage the process of changing to electric vehicles?",
    "What environmental problems are caused by generating electricity from fossil fuels?",
    "Do you agree that governments should invest more in electricity from renewable sources?",
    "Do you think internationally agreed targets for renewable energy use will ever be met?",

    // Long Journey
    "Why do some people like to make long journeys?",
    "Do you think airplanes are the best way to travel very long distances?",
    "What are the benefits of travelling with someone compared to travelling alone?",
    "What preparations do people need to make before travelling abroad?",
    "Why do some people prefer to travel in their own country rather than in other countries?",
    "How have people’s attitudes to travelling abroad changed in recent years?",
    "Do you think travellers might learn more about themselves than about the places they visit?",
    "Do you agree that increased international travel has led to a greater appreciation of cultural diversity?",
    "Do you think experiencing other countries through virtual reality might make international travel unnecessary in the future?",

    // Persuaded
    "What kinds of things do parents usually have to persuade their children to do?",
    "Do you think young people are more likely to listen to advice from their parents or from their teachers?",
    "What are some good ways to encourage students to do their best at school?",
    "Do you think businesses should pay celebrities to be in their advertisements?",
    "Do you agree that online ads have less influence than other types of advertising?",
    "What do you think makes an advertising campaign really successful?",
    "Do you think learning to write persuasively is an important skill for students?",
    "How important is it for public speakers to be good at persuading people?",
    "How can the skill of persuasion help solve big global problems?",

    // Conversation
    "What kinds of things do young people usually talk about with their friends?",
    "Do you think friends talk to each other more or less now than they did in the past?",
    "Do you agree that good friends don’t need to meet and talk in person?",
    "Why is good communication important in the workplace?",
    "What things can make communication difficult at work?",
    "Do you think managers should always ask their employees for their opinions?",
    "What kind of personal qualities does a good communicator need?",
    "Do you think body language is an important part of good communication?",
    "Do you agree that good communication skills are natural and can’t really be taught?",

    // Decision
    "What are some important decisions that teenagers often have to make?",
    "Why do some people take longer than others to make decisions?",
    "Do you agree that making quick decisions is always a bad idea?",
    "Why do people often ask others for advice before making a decision?",
    "Do people usually ask for advice more when it comes to personal issues or work-related problems?",
    "Do you think people only follow the advice they already agree with?",
    "What kinds of decisions do national leaders usually have to make?",
    "What factors should leaders think about when making big decisions?",
    "Do you agree that it’s okay for leaders to make decisions that might negatively affect some people?",

    // Goal
    "What kinds of personal goals do people usually set for themselves?",
    "Why do you think people like to set personal goals?",
    "How do personal goals change at different stages of life?",
    "How important is it to set clear goals for your career?",
    "What should people think about when they are planning their career path?",
    "What can happen if someone’s career goals start to clash with their personal goals?",
    "Why do you think some people reach success more quickly than others?",
    "In what different ways do people measure or define success?",
    "Do you agree that the biggest success comes from learning from your mistakes?",

    // Plan
    "What kinds of plans do young people usually make, like studying or traveling?",
    "Why do some people not enjoy making plans?",
    "Do you think parents should always support the plans their children make?",
    "What are the advantages of having a long-term plan?",
    "Why don’t people always stick to the plans they make?",
    "How might someone feel after they’ve achieved something they carefully planned for?",
    "What do you think of the idea that it’s better to live in the present than to plan for the future?",
    "What are some short-term and long-term plans that governments should make to improve society?",
    "Do you agree that successful planning for the future will need more cooperation between countries?",

    // Disagreement
    "What are some small things that family members often argue about?",
    "Do people tend to have more disagreements with family or with friends?",
    "Do you think conversations are more interesting when people have different opinions?",
    "When people can’t agree on something, do you think it’s a good idea to ask someone else to help?",
    "Why do some people find it hard to accept opinions that are different from theirs?",
    "Do you agree that sometimes it’s right to stick to your opinion, even if others disagree?",
    "What kind of personal qualities are important for people whose job is to solve disputes?",
    "Do you agree that companies could avoid conflicts by letting employees take part in decision-making?",
    "Do you think globalization might eventually put an end to international disputes?",

    // Science
    "How popular are science subjects at school?",
    "Do you think it is important for everyone to learn about science at school?",
    "How can museums help young people understand science better?",
    "In what ways does science affect our daily lives?",
    "What do you think is the most important scientific invention in the last hundred years?",
    "Do you agree that individuals have a responsibility to contribute to scientific research?",
    "What do you think might be the greatest advances in science in the future?",
    "What are the benefits of scientific collaboration between countries?",
    "Do you think science alone will be able to solve urgent global issues?",

    // Talent
    "Do you think it is possible to see talent in very young children?",
    "How can parents help to develop talents in their children?",
    "Do you agree that some parents put too much pressure on their children to develop their talents?",
    "How useful is it to have an artistic talent such as painting, singing, or dancing?",
    "Why are talent shows on television or online so popular nowadays?",
    "Do you think people with an artistic talent have a responsibility to develop it?",
    "Do you agree that people with an exceptional talent can contribute a lot to society?",
    "Do exceptionally talented people always have to be selfish in order to fulfil their potential?",
    "Should society give the highest status to exceptionally talented people?",

    // Old Object
    "What kinds of things from the past do families in your country often keep?",
    "How are the things younger people like to keep different from what older people prefer to keep?",
    "Do you agree that keeping family possessions helps people connect with the past?",
    "How do museums teach people about history?",
    "How can technology make history more interesting?",
    "Do you agree that knowing about history helps people understand the present?",
    "Do you think society today values possessions more than personal qualities?",
    "Do you agree with the view that money is what people value most nowadays?",
    "Why do you think there have been changes in what people value?",

    // Habit
    "What are some examples of good habits that children need to learn?",
    "How should parents help children to develop good habits?",
    "Why do children sometimes pick up bad habits?",
    "How do the habits of adults change as they grow older?",
    "What are the benefits of having a daily routine?",
    "Do you agree that people who have fixed routines are not creative?",
    "Why are social customs often different from one culture to another?",
    "How necessary are social customs to a society?",
    "What effect do you think globalisation might have on social customs?",

    // Book
    "What types of books do people your age usually enjoy reading?",
    "Do you think older people or younger people read more books?",
    "Do you think it is better to read a story in a book than to watch it as a film?",
    "How has the internet changed the way people use libraries?",
    "Do you agree that governments should continue to provide public libraries?",
    "What can libraries do to stay relevant in the future?",
    "Why is it so important today to be able to read well?",
    "Do you agree with the view that children who read the most often become the most successful adults?",
    "Do you think books still have the power to change the world?",

    // Social Media
    "Why do so many people use social media?",
    "Do you agree that social media is the best way to make new friends?",
    "Do you think everyone needs to be on social media nowadays?",
    "Do you think people waste too much time on social media?",
    "How true do you think the things people post on social media are?",
    "Do you agree that advertising on social media is annoying, but necessary?",
    "Do you agree that social media contributes to higher levels of loneliness in society?",
    "Does widespread use of social media make people more likely to change their opinions?",
    "Do you think social media could be used to solve many of society’s problems in the future?",

    // Toy
    "What are the most popular toys for children in your country?",
    "How are the toys children played with in the past different from the toys children play with now?",
    "Do you think children spend too much time playing games on screens these days?",
    "Do you think it is important for young children to play together?",
    "Why do some children prefer to play alone?",
    "Do you agree with the view that most adults should spend more time playing and having fun?",
    "How might modern toys benefit children’s development?",
    "Do you agree that a child’s physical development is just as important as their mental development?",
    "Do you think children learn their most valuable lessons in life from experience rather than from being taught?",

    // Traditional Story
    "What kinds of stories do children usually enjoy?",
    "Why do some children like to listen to a story before going to sleep?",
    "Do you think it is more enjoyable for children to read stories or to write them?",
    "Do you agree that films need to have a good story to be successful?",
    "How popular are films or movies that are based on true stories?",
    "Do you agree that films based on famous books are never as good as the books themselves?",
    "How easy is it for people today to understand the meaning of traditional stories?",
    "Do you think the main purpose of traditional stories is to teach people how to be good citizens?",
    "Do you think the moral lessons in traditional stories will still be relevant in the future?",

    // Wild Animal
    "In what ways can children learn about wildlife?",
    "Why do children often enjoy learning about wildlife?",
    "How important is it for children to learn about wildlife at school?",
    "Do you agree that it is essential to protect different wildlife species and their habitats?",
    "Why might people be more interested in protecting some species of wildlife than others?",
    "Do you think tourism has more positive or negative effects on the protection of wildlife species?",
    "Why might countries find it difficult to agree on priorities in wildlife conservation?",
    "Do you agree that when wildlife conservation priorities are set, wildlife in the ocean should get more attention?",
    "How likely is it that all governments will prioritise funding for global wildlife conservation projects?",

    // Second-hand
    "Do you think buying a lot of new clothes for babies and young children is a waste of money?",
    "What do people in your country usually do with clothes they no longer wear?",
    "Why do some people not like the idea of buying second-hand clothes?",
    "What problems can happen to the environment if people don’t recycle?",
    "Do you think in the future, everything will be recycled?",
    "Could there be any negative effects on a country’s economy if more people start recycling?",
    "Do factories always bring positive effects to the local community, or are there downsides too?",
    "Do you agree that countries should try to produce all their own goods instead of importing them?",
    "What do you think might happen to society if robots completely replace humans in manufacturing?",

    // Health Article
    "What are some things people usually do to stay healthy?",
    "Do you think it’s easy or difficult for people to live a healthy lifestyle these days?",
    "Do you think people will live healthier lives in the future?",
    "What are some good ways to people to get reliable information about health?",
    "Do you agree that it’s the school’s job—not the parents’—to teach young people how to live healthily?",
    "How important are government health campaigns in helping people make healthy choices?",
    "Should healthcare systems be paid for by individuals or through government taxes?",
    "Do you agree that traditional medicine still has a role in modern healthcare?",
    "What do you think about the idea that robots will be a key part of healthcare in the future?",

    // Teaching Skill
    "What personal qualities or skills do you think a good teacher should have?",
    "Do you think anyone can become a good teacher, or is it something only some people are suited for?",
    "Is it important for teachers to make their lessons fun and enjoyable?",
    "At what age do you think people learn new skills most easily?",
    "Which types of skills are more useful in daily life—practical skills or academic knowledge?",
    "Do you agree that people always learn better when they study in a group?",
    "Besides going to school, what are some other effective ways people can learn?",
    "Do you agree that today’s education systems are not keeping up with how fast society is changing?",
    "How do you think learning would be different if teachers were replaced by artificial intelligence?",

    // Outdoor Sport
    "What are the most popular outdoor sports for young people in your country?",
    "What are some disadvantages of doing sports outside?",
    "Do you think outdoor sports are more exciting than indoor ones?",
    "Are there any special physical benefits of playing sports outdoors?",
    "What can people learn from taking part in outdoor team sports?",
    "Do you agree that learning outdoor sports at school is just as valuable as other academic subjects?",
    "Are younger people better suited to adventure sports than older people?",
    "Why do you think so many extreme sports have appeared in recent years?",
    "Do you think people should be stopped from doing high-risk outdoor sports?",

    // Sports Event
    "What are the most popular sports that people enjoy watching in your country?",
    "Do you think there should be more sports programmes on TV and online?",
    "Why do some people prefer watching team sports instead of individual ones?",
    "Do you think the audience can influence how well athletes perform in competitions?",
    "Do you agree that offering prizes gives athletes more motivation to win?",
    "How important is intelligence for someone to succeed in sports competitions?",
    "How important is it for young people to have famous athletes as role models?",
    "In what ways can well-known sportspeople use their fame to help society?",
    "Do you think society sometimes expects too much from famous athletes?",

    // Advertisement
    "Where do people usually see or hear advertisements in your country?",
    "Do you think companies should be allowed to advertise their products to children?",
    "Is it possible for someone to completely avoid advertising nowadays?",
    "What are some common techniques advertisers use to get people’s attention?",
    "Do you agree that schools should teach children how advertising affects them?",
    "Do advertisements make people want things they don’t actually need?",
    "What negative effects can advertising have on different groups in society?",
    "Do you agree that advertising often uses stereotypes to sell products or services?",
    "What do you think about the idea that advertising adds value to people’s lives?",

    // Comedy Film
    "How popular are comedy films in your country?",
    "Why do you think people of all ages enjoy watching funny cartoons?",
    "Do you agree that most people prefer watching comedies rather than serious films?",
    "Do you think teachers should use jokes and encourage laughter in their classrooms?",
    "Why are some people especially good at making others laugh?",
    "What do you think about the idea that humor can be useful in business settings?",
    "Do professional comedians play an important role in society?",
    "To what extent do you think humor is something that all cultures share?",
    "Do you agree that laughter isn’t always a sign of happiness?",

    // Nature Place
    "What kinds of things do children like doing outdoors in nature?",
    "Do you think children spend enough time outdoors in nature nowadays?",
    "Which is better for children: living in a city or living in the countryside?",
    "Do you think recycling is important for protecting nature?",
    "Do you agree that having a vegetarian diet helps to protect nature?",
    "To what extent can an individual’s actions really help to protect nature?",
    "In what ways do you think a changing climate will affect the natural world?",
    "Do you agree that continued use of fossil fuels will cause damage that can never be undone?",
    "Do you think governments will be able to work together to provide environmental security for future generations?",

    // Building
    "What kinds of buildings do tourists usually enjoy visiting in your country?",
    "Do you think tourists should always pay to visit important buildings, such as historical sites?",
    "Do you agree that visiting buildings is the best way for tourists to learn about a place?",
    "Why do many people prefer to live in newer buildings rather than older ones?",
    "Do you think houses or flats/apartments are better homes for people in cities?",
    "Why might some people want to build their own homes instead of buying one?",
    "Do you agree that modern architectural styles make many new buildings look the same?",
    "How important do you think beauty is when designing buildings?",
    "Do you think it would be beneficial if everyone were consulted about the design of new public buildings?",

    // City to Return
    "What’s the difference between living in the city and in the countryside?",
    "Do you think living in the countryside is healthier than living in a city?",
    "Do people in the countryside socialize more than those in cities?",
    "What makes a city attractive to visitors?",
    "Some people say large cities are more suitable for old people. Do you agree?",
    "What are the differences between cities now and 20 years ago?",
    "Is it possible that one day almost everyone will live in cities?",
    "What should the government do to make cities safer?",
    "Do you think cities should focus more on tourism or on improving local life?",

    // Sky
    "What are some things people can usually see in the sky during the day?",
    "Why do many people enjoy watching the sunrise or sunset?",
    "Do you think the sky looked any different to people 100 years ago?",
    "Why are so many people interested in looking at the night sky?",
    "Do you agree that it’s important for people to learn about stars and planets?",
    "Why do you think there are so many stories and legends about the moon?",
    "Why are movies about space and space travel so popular?",
    "Do you think space exploration is a good use of public money?",
    "Do you think sending people to live in space would bring more benefits than drawbacks?",

    // Animal Place
    "How did animals help people in the past, like horses or camels?",
    "Do many people still rely on animals to help them nowadays?",
    "Do you agree that people should do more to care for the animals that help them?",
    "Why are animals often an important part of children’s stories and movies?",
    "Are children more interested in animals than adults?",
    "Do you agree that everyone should try to learn more about animals?",
    "How does the appearance of an animal affect how much people like it?",
    "What role does the media play in shaping people’s attitudes toward animals?",
    "What do you think about the idea that humans may be wrong to see themselves as superior to animals?",

    // Quiet Place
    "What are some places people go to when they want peace and quiet?",
    "Why do some people enjoy noisy restaurants more than quiet ones?",
    "Do you agree that there’s more noise outside cities than inside them?",
    "Do you think silence is necessary for someone to fully relax?",
    "Why do some people believe it’s helpful for students to study in complete silence?",
    "What do you think about the idea that teachers should sometimes stay silent and just listen to their students?",
    "Do you agree that people can communicate a lot without using any words?",
    "How useful do you think silence can be when someone wants to show they’re unhappy or disagree?",
    "What do you think about the idea that silence could help move society forward?",

    // Shop
    "Why do some people enjoy going to shopping centres or malls?",
    "What kinds of problems can shoppers face in shopping centres?",
    "Do you agree that big shopping malls have a negative impact on small towns?",
    "How has the way people shop changed in recent years?",
    "Are there any differences between how younger and older people shop?",
    "How can someone’s personality affect the way they shop?",
    "What do you think about the idea that people are under more pressure now to buy things they don’t really need?",
    "Do you agree that people should consider the environmental and social impact of what they buy?",
    "Is it possible to completely avoid the influence of consumer culture in today’s world?",

    // Beautiful Object
    "What kinds of natural places do people usually find beautiful?",
    "Why do you think many people enjoy visiting beautiful natural places?",
    "Do you agree that the best way to protect beautiful places in nature is to stop people from visiting them?",
    "How important do you think beauty is when designing things like buildings or furniture?",
    "Why do some people try to create things that are beautiful rather than just useful?",
    "What do you think about the idea that people spend too much money on taking care of beautiful man-made things?",
    "Why do you think our ideas of beauty keep changing over time?",
    "To what extent do you think a person’s idea of beauty is shaped by society?",
    "Do you agree that the only thing people around the world consider beautiful is nature?",

    // Creative Person
    "What are the benefits for children of learning to paint and draw at school?",
    "Do you think all children should learn to play a musical instrument?",
    "Do you agree that using computers helps children to be more creative?",
    "What jobs depend on people having creative skills?",
    "How important is visual media in the way news is presented?",
    "Why do you think cartoons appeal to so many adults nowadays?",
    "What qualities are needed to create great works of art?",
    "Do you agree that artistic ability cannot be learned?",
    "What do you think society would be like without creative people?",

    // Sportsperson
    "What sports do people in your country usually enjoy?",
    "Why do people try new sports?",
    "How important is it for people to find a sport they enjoy?",
    "Do you think all students should do sport at school?",
    "Why might some schools not offer any sport?",
    "Do you agree that the main benefit of team sports is helping students feel part of a group?",
    "Do you agree that involvement in sport offers an escape from the everyday pressures of life?",
    "Can sport and physical activity improve the health and well-being of people in a community?",
    "Do you agree that sport, by promoting universal values, can bring about societal change?",

    // Family Business
    "What kinds of family businesses are common where you live?",
    "What are the advantages of working for a family business?",
    "Why do you think some family businesses are more successful than others?",
    "Why do some people decide to start their own business?",
    "What kinds of problems might people face when starting their own business?",
    "Do you agree that children should be taught how to start a business when they are still at school?",
    "Why might it be beneficial for the economy to encourage more young people to set up new businesses?",
    "Do you agree that innovative businesses are the most important factor in boosting a country’s economy?",
    "Do you think the challenges of running a business are similar to the challenges of running an economy?",

    // Friend
    "How do children usually make friends?",
    "Do you agree that having a lot of friends is better than having a few close friends?",
    "What are the benefits of having friends of different ages?",
    "How are friendships at work different from friendships outside work?",
    "Do you think it is possible for employees to be good friends with their boss?",
    "Do you agree that developments in technology have improved relationships in the workplace?",
    "How can countries benefit from co-operating with each other?",
    "Do you think countries will be able to solve environmental problems without co-operating?",
    "Do you think it will be necessary for countries to share knowledge and resources more in the future?",

    // Old Person
    "Do you think it’s good for children to spend a lot of time with their grandparents?",
    "Which do you think is easier—being a parent or being a grandparent?",
    "Is it always better for older people to live with their families?",
    "What benefits can a company get from hiring older employees?",
    "Why do most countries set a specific age for retirement?",
    "Do you think it’s more beneficial or harmful for older people to keep working after they retire?",
    "Why are there more and more older people in many parts of the world today?",
    "How can a growing elderly population affect society as a whole?",
    "Do you agree that younger and older people have completely different opinions about where society should be heading?",

    // Clothes
    "How do people usually dress for work in your country?",
    "Why do you think older and younger people often wear different styles of clothing at work?",
    "Do you agree that it’s more important to feel comfortable than to look smart at work?",
    "What are the most important things people should think about when buying new clothes?",
    "What do you think about the idea of buying clothes online?",
    "Why do so many people enjoy shopping for clothes in their free time?",
    "Do you agree that choosing what to wear is a creative activity for most people?",
    "Do you think the clothes someone wears can influence their mood or behaviour?",
    "To what extent do you think a person’s clothing reflects their real personality?",

    // Behaving Badly
    "What are some common things young children do when they’re behaving badly?",
    "What can parents do to stop their children from misbehaving?",
    "Do you agree that parents used to be stricter with their children than they are today?",
    "Who has more influence on a young person’s behaviour—family or friends?",
    "Is setting a good example the most effective way to change someone’s behaviour?",
    "What do you think of the idea that people will only change their behaviour if they want to?",
    "Why is it sometimes hard for people to behave ethically in today’s world?",
    "Do you agree that people who treat others badly are more likely to succeed in life?",
    "What do you think about the idea that everyone has both good and bad sides by nature?",

    // Intelligent Person
    "What kinds of games can help children become more intelligent？",
    "Do you agree that talking to children is the best way to help them develop their intelligence?",
    "Do you think spending too much time on modern technology can make children less intelligent?",
    "What types of jobs require a high level of intelligence?",
    "Do you think managers should use intelligence tests when hiring new employees?",
    "Do you agree that being very intelligent can sometimes be a disadvantage at work?",
    "In what areas of life do you think artificial intelligence will play an important role in the future?",
    "Do you think artificial intelligence will ever fully match human intelligence?",
    "What possible dangers could come from relying too much on artificial intelligence?",

    // Singer/Music
    "What kinds of music do people in your country listen to the most?",
    "Why do people enjoy listening to music?",
    "How does listening to live music compare to listening to recorded music?",
    "Do you agree that every child should learn to play a musical instrument at school?",
    "What do you think about the idea that anyone can learn to sing well?",
    "How could governments help support musicians who are very talented?",
    "How valuable do you think international music events, like festivals or competitions, are?",
    "What do you think about the idea that a country’s music can improve its international image?",
    "Do you agree that music plays a major role in shaping a country’s culture?",

    // Person Friend
    "Where do people usually go to make new friends in your country?",
    "Why do some people find it hard to make new friends?",
    "Do you agree that modern technology makes it easier to make friends than it was 50 years ago?",
    "Do you think people usually become friends with others who are similar to them?",
    "Can having friends who are much older than you be a good thing?",
    "Why is it sometimes difficult to keep the same friends throughout your life?",
    "Do you think friendships can ever be just as important as family relationships?",
    "What do you think about the idea that friendship is a basic psychological need for most people?",
    "How might society be affected in the future if people’s friendships become less meaningful?"
];

// Map the 13 Logic Categories to Keywords and Weights
export const IELTS_TAXONOMY: TopicCategory[] = [
    {
        id: 'why',
        label: '原因类',
        enLabel: 'Reason (Why)',
        icon: 'HelpCircle',
        color: 'bg-blue-500',
        lightColor: 'bg-blue-100',
        textColor: 'text-blue-600',
        p1Weight: 0.4, 
        allowPart3: true,
        // STRICTER KEYWORDS: Prevent 'because' from matching 'cause' via Regex
        keywords: ['why', 'reason', 'cause'], 
        formulaIds: ['formula_why']
    },
    {
        id: 'like',
        label: '喜好类',
        enLabel: 'Likes/Dislikes',
        icon: 'Heart',
        color: 'bg-pink-500',
        lightColor: 'bg-pink-100',
        textColor: 'text-pink-600',
        p1Weight: 1.0, 
        allowPart3: false,
        keywords: ['like', 'enjoy', 'favorite', 'keen on', 'love', 'interested'],
        excludes: ['why', 'reason'],
        formulaIds: ['formula_like']
    },
    {
        id: 'prefer',
        label: '偏好类',
        enLabel: 'Preferences',
        icon: 'GitCompare',
        color: 'bg-purple-500',
        lightColor: 'bg-purple-100',
        textColor: 'text-purple-600',
        p1Weight: 1.0, 
        allowPart3: false,
        keywords: ['prefer', 'rather', 'choice', 'choose'],
        excludes: ['why'],
        formulaIds: ['formula_prefer']
    },
    {
        id: 'viewpoint',
        label: '观点类',
        enLabel: 'Viewpoint',
        icon: 'MessageSquare',
        color: 'bg-indigo-500',
        lightColor: 'bg-indigo-100',
        textColor: 'text-indigo-600',
        p1Weight: 0.1, 
        allowPart3: true,
        keywords: ['do you think', 'agree', 'opinion', 'believe', 'view', 'important'],
        excludes: ['why'],
        formulaIds: ['formula_viewpoint']
    },
    {
        id: 'broad',
        label: '大范围类',
        enLabel: 'People/Society',
        icon: 'Globe',
        color: 'bg-teal-500',
        lightColor: 'bg-teal-100',
        textColor: 'text-teal-600',
        p1Weight: 0.2, 
        allowPart3: true,
        keywords: ['people', 'children', 'society', 'young', 'old', 'men', 'women'],
        formulaIds: ['formula_broad']
    },
    {
        id: 'habit',
        label: '个人习惯类',
        enLabel: 'Habits',
        icon: 'Coffee',
        color: 'bg-orange-500',
        lightColor: 'bg-orange-100',
        textColor: 'text-orange-600',
        p1Weight: 1.0, 
        allowPart3: false,
        keywords: ['usually', 'normally', 'habit', 'routine', 'often', 'every day'],
        excludes: ['why'],
        formulaIds: ['formula_habit']
    },
    {
        id: 'frequency',
        label: '频率类',
        enLabel: 'Frequency',
        icon: 'Clock',
        color: 'bg-amber-500',
        lightColor: 'bg-amber-100',
        textColor: 'text-amber-600',
        p1Weight: 0.9, 
        allowPart3: true,
        keywords: ['how often', 'frequently', 'often'],
        formulaIds: ['formula_frequency']
    },
    {
        id: 'time_util',
        label: '时间利用类',
        enLabel: 'Time Usage',
        icon: 'Calendar',
        color: 'bg-green-500',
        lightColor: 'bg-green-100',
        textColor: 'text-green-600',
        p1Weight: 0.7, 
        allowPart3: true,
        keywords: ['free time', 'weekend', 'spend time', 'holiday', 'break'],
        formulaIds: ['formula_time_util']
    },
    {
        id: 'future',
        label: '未来相关类',
        enLabel: 'Future',
        icon: 'Rocket',
        color: 'bg-sky-500',
        lightColor: 'bg-sky-100',
        textColor: 'text-sky-600',
        p1Weight: 0.3, 
        allowPart3: true,
        keywords: ['future', 'plan', 'next few years', 'will', 'going to'],
        formulaIds: ['formula_future']
    },
    {
        id: 'pros_cons',
        label: '优缺点类',
        enLabel: 'Pros & Cons',
        icon: 'Scale',
        color: 'bg-red-500',
        lightColor: 'bg-red-100',
        textColor: 'text-red-600',
        p1Weight: 0.1, 
        allowPart3: true,
        keywords: ['advantage', 'benefit', 'drawback', 'good thing', 'positive', 'negative'],
        formulaIds: ['formula_pros_cons']
    },
    {
        id: 'time_compare',
        label: '时间对比类',
        enLabel: 'Past vs Present',
        icon: 'History',
        color: 'bg-yellow-600',
        lightColor: 'bg-yellow-100',
        textColor: 'text-yellow-700',
        p1Weight: 0.1, 
        allowPart3: true,
        keywords: ['change', 'past', 'years ago', 'changed', 'history'],
        formulaIds: ['formula_time_compare']
    },
    {
        id: 'obj_compare',
        label: '对比类',
        enLabel: 'Comparison',
        icon: 'ArrowRightLeft',
        color: 'bg-cyan-600',
        lightColor: 'bg-cyan-100',
        textColor: 'text-cyan-700',
        p1Weight: 0.2, 
        allowPart3: true,
        keywords: ['compare', 'difference', 'better', 'than'],
        formulaIds: ['formula_obj_compare']
    },
    {
        id: 'solution',
        label: '问题解决类',
        enLabel: 'Solutions',
        icon: 'Zap',
        color: 'bg-rose-500',
        lightColor: 'bg-rose-100',
        textColor: 'text-rose-600',
        p1Weight: 0.0, 
        allowPart3: true,
        keywords: ['solve', 'solution', 'how can', 'what can be done', 'measure'],
        formulaIds: ['formula_solution']
    }
];

// Fallback for general or unspecified topics
export const IELTS_Part1_Topics = P1_RAW;
export const IELTS_Part2_Topics = [
    // Events
    "Describe a time when you got lost in a town or city.",
    "Describe a dinner with friends that you enjoyed.",
    "Describe a time when you received very good service from a shop/store or a company.",
    "Describe the first time you had to communicate in a foreign language.",
    "Describe an occasion when you accidentally broke an object in your home.",
    "Describe a time you remember when someone apologized to you (e.g. said sorry).",
    "Describe an occasion when you felt excited about trying an activity for the first time.",
    "Describe a time when you had to wait for something special to happen.",
    "Describe an occasion when the electricity suddenly went off (e.g. at home).",
    "Describe a long journey you made that you would like to make again.",
    "Describe a time when you were happy that someone persuaded you to do something.",
    "Describe an interesting conversation that you remember well.",
    "Describe an important decision that you made with the help of another person.",
    "Describe a time when you set yourself a goal and did your best to achieve it.",
    "Describe a time when you made plans to do an activity with other people.",
    "Describe an occasion when two of your friends disagreed about something.",
    
    // Things
    "Describe an area of science that interests you (e.g. physics, medicine, psychology).",
    "Describe a natural talent you have that you would like to improve (e.g. music, sport, mathematics).",
    "Describe something important to you that your family has had for a long time.",
    "Describe a good habit a friend has that you would like to develop.",
    "Describe a book you have read that you found useful.",
    "Describe a time when you found out something very interesting through social media.",
    "Describe a toy that you enjoyed playing with when you were a child.",
    "Describe a traditional story that you think is interesting (e.g. a fairy tale, a legend, a story about heroes).",
    "Describe a wild animal you would like to learn more about.",
    "Describe a website you know about where people can buy second-hand or recycled things.",
    "Describe an interesting article on health that you have read.",
    "Describe a skill you have that you think you would be good at teaching other people (e.g. driving, mathematics, cooking).",
    "Describe an outdoor sport you would like to try for the first time.",
    "Describe a sports event that you would like to go and watch as part of the audience (e.g. at a stadium).",
    "Describe a time when you saw an advertisement for a well-known product.",
    "Describe a film/movie you saw that made you laugh.",
    
    // Places
    "Describe an outdoor place where you go to enjoy nature (e.g. a park, a beach, a desert).",
    "Describe an interesting building that you would like to visit (e.g. a stadium, a castle).",
    "Describe a city you have visited which you would like to go back to again.",
    "Describe a time when you watched something interesting in the sky.",
    "Describe a place you visited where you saw some animals.",
    "Describe a place you enjoyed visiting that was very quiet (e.g. a library, a place in nature).",
    "Describe a shop/store that you enjoy going to.",
    "Describe an object that you think is very beautiful.",
    
    // People
    "Describe a creative person whose work you admire (e.g. an artist, a musician, an inventor).",
    "Describe a famous sportsperson who you admire.",
    "Describe a person you know who enjoys working for a family business (e.g. a shop/store, a restaurant).",
    "Describe someone who has been a good friend to you.",
    "Describe a very old person you enjoy talking to who has had an interesting life.",
    "Describe a person who wears clothes that you think are unusual.",
    "Describe a time when you saw a young child behaving badly in a public place.",
    "Describe a person you know who you think is very intelligent.",
    "Describe a person whose music or singing you like.",
    "Describe a person who you did not like when you first met, but who then became your friend."
];
export const IELTS_Part3_Topics = P3_RAW;
export const IELTS_Writing_Task2_Topics = [
    "Topic: Some people believe that university education should be free for everyone. To what extent do you agree or disagree?",
    "Topic: Many people today are choosing to live alone. What are the causes of this? Does it have positive or negative effects on society?",
    "Topic: The best way to solve traffic congestion is to provide free public transport. Discuss this view and give your own opinion.",
    "Topic: Some think that the government should ban dangerous sports. Others believe people should be free to choose. Discuss both views.",
    "Topic: With the rise of AI, many jobs are disappearing. What measures can be taken to solve this problem?",
    "Topic: Should children be taught how to manage money at school? Do the advantages outweigh the disadvantages?",
    "Topic: Environmental problems are too big for individuals to solve. Only governments can solve them. To what extent do you agree?",
    "Topic: In many countries, the tradition of families having meals together is disappearing. Why is this happening? What will be the effects?",
    "Topic: Some people think that social media has a negative impact on individuals and society. To what extent do you agree?",
    "Topic: Is it better for children to grow up in the countryside or in a large city? Discuss both views."
];

// Helper to filter questions based on keywords (REGEX UPDATED)
export const filterQuestionsByKeywords = (pool: string[], keywords: string[], excludes?: string[]): string[] => {
    if (!keywords || keywords.length === 0) return pool;
    
    return pool.filter(question => {
        const qLower = question.toLowerCase();
        
        // 1. Check Excludes (Simple includes is fine for aggressive exclusion)
        if (excludes && excludes.length > 0) {
            const hasExclude = excludes.some(ex => qLower.includes(ex.toLowerCase()));
            if (hasExclude) return false;
        }

        // 2. Check Keywords (Regex Boundary Match)
        const hasKeyword = keywords.some(k => {
            const cleanK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex chars
            // Match whole word boundary to prevent 'cause' matching 'because'
            // If keyword has spaces (e.g. "free time"), \b matches the start and end of the phrase
            const regex = new RegExp(`\\b${cleanK}\\b`, 'i');
            return regex.test(qLower);
        });

        return hasKeyword;
    });
};
