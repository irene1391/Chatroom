//This is the orm portion 
//We used Mysql database to store information of user, room and message.
// user table store username and password of user 
// user_attribute table store token of user
// room table store room name, room password(if need ),creator id 
// room_atribute table store  baned user id  of room
// message table store messages.  one of our creative portion is to review message history
const Sequelize = require('sequelize')
const env = require('../env')

class DBManage {
  constructor () {
    this.connection = new Sequelize(env.database.name, env.database.username, env.database.password, { host: env.database.host, dialect: 'mysql' })

    // Test database connection
    this.connection
      .authenticate()
      .then(() => console.log('Database Connected'))
      .catch(err => console.error('Cannot connect to the database:', err))

    this.User = this.connection.define('user', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      }
    }, { timestamps: false })

    this.UserAttribute = this.connection.define('user_attribute', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: this.User,
          key: 'id'
        }
      },
      type: {
        type: Sequelize.ENUM(['token']),
        allowNull: false
      },
      value: {
        type: Sequelize.STRING,
        allowNull: true
      }
    }, { timestamps: false })

    this.Room = this.connection.define('room', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      creator_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: this.User,
          key: 'id'
        }
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      password: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null
      },
      is_private: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    }, { timestamps: false })

    this.RoomAttribute = this.connection.define('room_attribute', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      room_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: this.Room,
          key: 'id'
        }
      },
      type: {
        type: Sequelize.ENUM(['banned_user_id']),
        allowNull: false
      },
      value: {
        type: Sequelize.STRING,
        allowNull: true
      }
    }, { timestamps: false })

    this.Message = this.connection.define('message', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      room_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: this.Room,
          key: 'id'
        }
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: this.User,
          key: 'id'
        }
      },
      content: {
        type: Sequelize.STRING,
        allowNull: false
      }
    }, { timestamps: false })
  }
// The function below is the way to get,update,delete,create data from database

  applyResult (result, callback) {
    try {
      callback(JSON.parse(JSON.stringify(result)))
    } catch (error) {
      callback(null)
      console.error(error)
    }
  }

  getModel (key) {
    return ({
      user: this.User,
      userAttribute: this.UserAttribute,
      room: this.Room,
      roomAttribute: this.RoomAttribute,
      message: this.Message
    })[key]
  }

  query (tablename, conditionKV = null) {
    const model = this.getModel(tablename)

    return new Promise(resolve => {
      if (!conditionKV) model.findAll().then(result => this.applyResult(result, resolve))
      else model.findAll({ where: conditionKV }).then(result => this.applyResult(result, resolve))
    })
  }

  create (tablename, fieldKV) {
    const model = this.getModel(tablename)

    return new Promise(resolve => model.create(fieldKV).then(result => this.applyResult(result, resolve)))
  }

  update (tablename, fieldKV, conditionKV) {
    const model = this.getModel(tablename)

    return new Promise(resolve => model.update(fieldKV, { where: conditionKV }).then(result => this.applyResult(result, resolve)))
  }

  remove (tablename, conditionKV) {
    const model = this.getModel(tablename)

    return new Promise(resolve => model.destroy({ where: conditionKV }).then(result => this.applyResult(result, resolve)))
  }
}

module.exports = new DBManage()
