///////////////////////
////// VARIABLES //////
///////////////////////

// CONSTANTS
const int TYPE_EMPTY	= 0;
const int SPRITE_SIZE	= 6;
const int DRAW_SCALE	= 14;

const int ENTITY_MAX	= 10000;

const int CANVAS_WIDTH	= 1920;
const int CANVAS_HEIGHT	= 1080;

// VARS
typedef int	char32;
int 	objPosition			= 0;
int		frame				= 0;
int		RNG					= 0;

// ARRAYS
int		eType[ENTITY_MAX];
float	eX[ENTITY_MAX];
float	eY[ENTITY_MAX];

float	eSpeedX[ENTITY_MAX];
float	eSpeedY[ENTITY_MAX];
float	eMaxSpeed[ENTITY_MAX];

float	eRot[ENTITY_MAX];
float	eRotSpeed[ENTITY_MAX];

// int		eGraphic[ENTITY_MAX];
// int		eOther[ENTITY_MAX];

float	eTimer[ENTITY_MAX];
int		eFlip[ENTITY_MAX];

const int TYPE_ME		= 1;
const int TYPE_EMOTE	= 2;

float square(float val){
	return val * val;
}

// Recommended PI const from: http://www.cplusplus.com/forum/beginner/83485/
const float PI = 3.1415927;

const int SYNTH_MAX = 10;
// Synth arrays. Shared with JS.
int		sNote[SYNTH_MAX];
float	sDuration[SYNTH_MAX];
float	sDelay[SYNTH_MAX];

///////////////////////
//// PRE FUNCTIONS ////
///////////////////////

// Returns a float between 0 and 1. Randomizes using a linear-feedback shift register.
unsigned short lfsr = 1234; // Linear-feedback shift register value, for RNG
float rng(){
	lfsr = (lfsr >> 1) | ((((lfsr >> 0) ^ (lfsr >> 2) ^ (lfsr >> 3) ^ (lfsr >> 5) ) & 1) << 15);
	return (float)lfsr / 65535.0f; // Cast it to a float and divide by the maximum
}

int getInactiveSynthId(){
	for(int s = 0; s < SYNTH_MAX; s ++) if(!sNote[s]) return s;
	return -1; // No inactive synth was found
}

// Get a note from a string ("a2", "b#3", "gb0", ...)
int getHalfstepsOfNote(char string[3]){
	int halfsteps	= 0;
	int place		= 0;
	
	// TODO: implement new tone setup from Jeff Neet
	/*
		var octave = 0;
		
		//	f = 440 * 2 ^(n/12)
		//	f = Octave * 110 * 2 ^(n/12)
		
		f = Octave * 110 * Math.pow(2,(n/12))
	*/

	switch(string[place ++]){
		case 'a':	halfsteps += 0;		break;
		case 'b':	halfsteps += 2;		break;
		case 'c':	halfsteps += 3;		break;
		case 'd':	halfsteps += 5;		break;
		case 'e':	halfsteps += 7;		break;
		case 'f':	halfsteps += 9;		break;
		case 'g':	halfsteps += 10;	break;
		default:break;
	}

	// Check for flats and sharps
	switch(string[place]){
		case '#':case 's':	halfsteps ++; place ++; break;
		case 'b':case 'f':	halfsteps --; place ++; break;
		default:break;
	}
	
	// The char's value is between '0' and '6' (used for octave)
	if(string[place] >= 48
		&& string[place] <= 48 + 6
	) halfsteps += (string[place] - 48 - 4) * 12;
	
	return halfsteps;
}

int queueNote(
	char noteName[3]
	,float duration
	,float delay
){
	
	int s = getInactiveSynthId();
	if(s == -1) return -1;
	
	sNote[s]		= getHalfstepsOfNote(noteName);
	sDuration[s]	= duration;
	sDelay[s]		= delay;
	return s;
}

// Help: https://ourcodeworld.com/articles/read/884/how-to-get-the-square-root-of-a-number-without-using-the-sqrt-function-in-c
float getSqrt(int number){
    float temp, sqrt;

    // store the half of the given number e.g from 256 => 128
    sqrt = number / 2;
    temp = 0;

    // Iterate until sqrt is different of temp, that is updated on the loop
    while(sqrt != temp){
        // initially 0, is updated with the initial value of 128
        // (on second iteration = 65)
        // and so on
        temp = sqrt;

        // Then, replace values (256 / 128 + 128 ) / 2 = 65
        // (on second iteration 34.46923076923077)
        // and so on
        sqrt = (number/temp + temp) / 2;
    }

	return sqrt;
}

int entityInit(
	int type
	,float x
	,float y
	,float speedX
	,float speedY
	,float rot,
	float rotSpeed
){
	for(int e = 0; e < ENTITY_MAX; e++){
		// Don't overwrite active entities
		if(eType[e] != 0) continue;
		
		eType[e]		= type;
		// eX[e]			= frame % CANVAS_WIDTH;
		// eY[e]			= frame % CANVAS_HEIGHT;
		eX[e]			= x;
		eY[e]			= y;

		eSpeedX[e]		= speedX;
		eSpeedY[e]		= speedY;
		eMaxSpeed[e]	= 0.0f;

		eRot[e]			= rot;
		eRotSpeed[e]	= rotSpeed;

		eTimer[e]		= 0.0f;
		
		// We created an entity, break here
		return e;
	}
	
	return -1;
}

void meLeap(int id){
	eY[id]		= CANVAS_HEIGHT - (SPRITE_SIZE * DRAW_SCALE * 0.5f) - 1.0f;
	eSpeedY[id]	= -2700.0f;
	
	queueNote("g2",0.25f,0.0f);
}

void meJump(int id){
	eSpeedY[id] = - 400.0f;
	
	// Start rotating a little bit
	if(eRotSpeed[id] == 0)
		eRotSpeed[id] = (rng() + -0.5f) * 100.0f;
	
	queueNote("e2",0.25f,0.0f);
}
/*
void entityTest(int amount){
	for(int i = 0; i < amount; i++){
		entityInit(0);
	}
}*/

// Just based on !mes for now
void loopEntities(float sDeltaTime, int climbable){
	rng(); // Update RNG
	
	// Entity-specific stuff
	for(int e = 0; e < ENTITY_MAX; e++){
		if(eType[e] == 0) continue;
		
		switch(eType[e]){
			// Confetti: it rises and it falls
			case TYPE_CONFETTI:
				// If confetti is moving up, start moving it down
				if(eSpeedY[e] < 360.0f){
					eSpeedY[e] += 7000.0f * sDeltaTime;
					//eRot[e] += -10 + (rng() * 20);
					
					// Rotate a little slower on this uptake
					//eRotSpeed[e] / 4 * 60 * sDeltaTime;
				// On moving down, have it twiddle back and forth a little more
				} else {
					// Move left and right a little slower
					eSpeedX[e] += (-480.0f + rng() * 960.0f) * sDeltaTime;
					
					// May fall a little faster or slower
					if(rng() > 0.7f){
						eSpeedY[e] += (-90.0f + (rng() * 180.0f)) * sDeltaTime;
					}
					
					// Rotate
					eRotSpeed[e] += (-4800.0f + (rng() * 9600.0f)) * sDeltaTime;
				}
				
				// Make inactive if outside of the area
				if(eY[e] > 1080.0f && eSpeedY[e] > 0.0f) eType[e] = 0;
				break;
			// Mes: they fall, they leap, etc
			case TYPE_ME:
				if(eX[e] > (float)CANVAS_WIDTH)
					eX[e] = 0;
				
				if(eX[e] < 0)
					eX[e] = (float)CANVAS_WIDTH;
			
				// If on not live, let them wrap y as well
				if(climbable == 1 || eTimer[e] > 0.0f){
					if(eY[e] > CANVAS_HEIGHT) eY[e] = 0.0f;
					else if(eY[e] < 0.0f) eY[e] = CANVAS_HEIGHT;
				// If on live, make them fall down
				} else {
					// Make fall if over the ground
					if(eY[e] + (SPRITE_SIZE * DRAW_SCALE / 2) < CANVAS_HEIGHT){
						eSpeedY[e] += 4000.0f * sDeltaTime;
						
						// Spin a little
						//if(eRotSpeed[e] == 0) eRotSpeed[e] = (rng() + -.5) * .00000005 * sDeltaTime;
						if(eRotSpeed[e] == 0.0f) eRotSpeed[e] = (rng() + -0.5f) * 400.0f;
						eRotSpeed[e] += ((eRotSpeed[e] > 0.0f ? 1.0f : -1.0f) * 200.0f * sDeltaTime);
					}
					// If on the ground, and SpeedY isn't moving us up
					else if(eSpeedY[e] >= 0.0f){
						// If just landing
						if(eSpeedY[e] > 0)
							queueNote("d2",0.25f,0.0f);
						
						eRotSpeed[e] = 0;
						eSpeedY[e] = 0;
						
						eRot[e] = 0;
						eY[e] = CANVAS_HEIGHT - (SPRITE_SIZE * DRAW_SCALE / 2);
					}
				}
				break;
			// Emotes: they disappear after a set amount of time
			case TYPE_EMOTE:
				// decrease vertical speed
				// if(eSpeedY[e] < -.02f) eSpeedY[e] *= 1.0f - (10.0f * sDeltaTime);
				if(eSpeedY[e] < -.02f)
					eSpeedY[e] *= 1.0f - (10.0f * sDeltaTime);
				
				// Deactivate on timer running out
				if(eTimer[e] <= 0.0f)
					eActive[e] = 0;
				break;
			// Hearts: they float off the screen
			case HEART:
				if(eY[e] < -30.0f)
					eType[e] = 0;
				break;
			// Rain: make it fall, but then vanish if it falls off-screen
			case TYPE_RAIN:
				if(eY[e] > CANVAS_HEIGHT)
					eType[e] = 0;
				else
					eSpeedY[e] *= 1.1f;
				break;
			default:
				break;
		}
		eRot[e] += eRotSpeed[e] * sDeltaTime;
	}
	
	// Loop through data sets one at a time, so we can cache the whole thing in memory and loop through them really quickly
	for(int e = 0; e < ENTITY_MAX; e ++)
		eRot[e] += eRotSpeed[e] * sDeltaTime;
	for(int e = 0; e < ENTITY_MAX; e ++)
		eX[e] += eSpeedX[e] * sDeltaTime;
	for(int e = 0; e < ENTITY_MAX; e ++)
		eY[e] += eSpeedY[e] * sDeltaTime;
	for(int e = 0; e < ENTITY_MAX; e ++){
		if(eTimer[e] > 0.0f) eTimer[e] -= sDeltaTime;
	}
}