const Sequelize = require('sequelize')
const bcrypt = require('bcryptjs')

const DATABASE_URL = process.env.DATABASE_URL

const sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: 'data/apptest.db',
	logging: false
  });

const globalModelConfig = {
	underscored: true,
	timestamps: true,
}

sequelize.authenticate()
	.then(() => {
		// eslint-disable-next-line no-console
		console.log('Connection has been established successfully.')
	})
	.catch((err) => {
		// eslint-disable-next-line no-console
		console.error('Unable to connect to the database:', err)
	})

const SessionModel = sequelize.define('Session', {
	sid: {
		type: Sequelize.STRING,
		primaryKey: true
	},
	expires: Sequelize.DATE,
	data: Sequelize.STRING(50000),
}, globalModelConfig)

const UserModel = sequelize.define('User', {
	uid: {
		type: Sequelize.INTEGER,
		primaryKey: true,
		autoIncrement: true,
	},
	name: Sequelize.STRING(30),
	phone: Sequelize.TEXT,
	password_hash: Sequelize.STRING(255),
}, globalModelConfig)

const SoloModel = sequelize.define('Solo', {
	id: {
		type: Sequelize.INTEGER,
		primaryKey: true,
		autoIncrement: true,
	},
	pros: Sequelize.TEXT,
	cons: Sequelize.TEXT,
	age: Sequelize.INTEGER,
	etc: Sequelize.TEXT,
	isSolo: Sequelize.BOOLEAN,
	gender: Sequelize.ENUM('W','M')
}, globalModelConfig)

SoloModel.belongsTo(UserModel);

const Friends = sequelize.define('Friends', {
	id: {
		type: Sequelize.INTEGER,
		primaryKey: true,
		autoIncrement: true,
	},
	friendPhone: Sequelize.TEXT
}, globalModelConfig)

Friends.belongsTo(UserModel); 

sequelize.sync({
	alter: true
})

const getUserById = uid => UserModel.findOne({ where: { uid } })
const getUserByphone = phone => UserModel.findOne({ where: { phone } })


// const isphoneInUse = async phone => {
// 	return await getUserByphone(phone) !== null
// }

const isphoneInUse = async phone => {
	return (await getUserByphone(phone) ? true : false)
}

const createUserRecord = userObj => new Promise(async (resolve, reject) => {
	const passwdHash = await createPasswordHash(userObj.password)
	UserModel.create({

		phone: userObj.phone,
		password_hash: passwdHash
	})
		.then((createdUser) => {
			resolve(createdUser)
		})
		.catch(err => reject(err))
})

const createPasswordHash = password => new Promise(async (resolve, reject) => {
	try {
		const saltRounds = 10
		bcrypt.hash(password, saltRounds, (err, hash) => {
			resolve(hash)
		})
	}
	catch (err) {
		reject(err)
	}
})

const isPasswordHashVerified = (hash, password) => new Promise(async (resolve, reject) => {
	try {
		bcrypt.compare(password, hash, (err, res) => {
			resolve(res)
		})
	}
	catch (err) {
		reject(err)
	}
})

module.exports = (session) => {
	const SequelizeStore = require('connect-session-sequelize')(session.Store)
	
	const SessionStore = new SequelizeStore({
		db: sequelize,
		table: 'Session'
	})

	return {
		SessionStore,
		getUserById,	
		getUserByphone,
		isphoneInUse,
		createUserRecord,
		isPasswordHashVerified,
		SoloModel
	}
}
