/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var App = require('app');

describe('App.ConfigRecommendationParser', function() {
  var mixinObject = Em.Controller.extend(App.ConfigRecommendationParser, {});
  var instanceObject = mixinObject.create({});

  var recommendationObject = {
    'fileName1': {
      'properties': {
        'p1': 'v1'
      },
      'property_attributes': {
        'p2': {
          'delete': true
        },
        'p3': {
          'maximum': 100,
          'minimum': 1
        }
      }
    }
  };
  var configs = [
    Em.Object.create({
      name: 'p1',
      filename: 'fileName1'
    }),
    Em.Object.create({
      name: 'p2',
      filename: 'fileName1'
    }),
    Em.Object.create({
      name: 'p3',
      filename: 'fileName1'
    })
  ];

  beforeEach(function() {
    instanceObject.set('stepConfigs', []);
  });


  describe('#parseRecommendations', function() {

    describe('#recommendartion parsed', function() {
      beforeEach(function() {
        instanceObject.reopen({
          updateCallback: Em.K,
          removeCallback: Em.K,
          updateBoundariesCallback: Em.K
        });

        sinon.stub(App.configsCollection, 'getConfigByName', function(name, fileName) {
          return { name: name, filename: fileName };
        });
        sinon.stub(instanceObject, 'allowUpdateProperty').returns(true);

        sinon.spy(instanceObject, 'updateCallback');
        sinon.spy(instanceObject, 'removeCallback');
        sinon.spy(instanceObject, 'updateBoundariesCallback');

        instanceObject.parseRecommendations(recommendationObject, configs, null, null,
          instanceObject.updateCallback, instanceObject.removeCallback, instanceObject.updateBoundariesCallback);
      });

      afterEach(function() {
        App.configsCollection.getConfigByName.restore();

        instanceObject.allowUpdateProperty.restore();
        instanceObject.updateCallback.restore();
        instanceObject.removeCallback.restore();
        instanceObject.updateBoundariesCallback.restore();
      });

      it('updateCallback', function() {
        expect(instanceObject.updateCallback.calledWith(configs[0], 'v1', null, null)).to.be.true;
      });

      it('removeCallback', function() {
        expect(instanceObject.removeCallback.calledWith(configs[1], configs, null, null)).to.be.true;
      });

      it('updateBoundariesCallback maximum', function() {
        expect(instanceObject.updateBoundariesCallback.calledWith({ name: 'p3', filename: 'fileName1' },
          'maximum', 100, null)).to.be.true;
      });

      it('updateBoundariesCallback minimum', function() {
        expect(instanceObject.updateBoundariesCallback.calledWith({ name: 'p3', filename: 'fileName1' },
          'minimum', 1, null)).to.be.true;
      });
    });

    it('#recommendation parsing failed', function() {
      expect(instanceObject.parseRecommendations.bind(instanceObject, null)).to.throw(App.ObjectTypeError);
    });

    it('#recommendation parsing failed', function() {
      expect(instanceObject.parseRecommendations.bind(instanceObject, {}, null)).to.throw(App.ArrayTypeError);
    });

    it('#recommendation parsing failed', function() {
      expect(instanceObject.parseRecommendations.bind(instanceObject, {}, [Em.Object.create({name: 'cfg1'})])).to.throw(App.FunctionTypeError);
    });
  });

  describe('#addByRecommendations', function(){
    var _recommendationObject = {
      'file-name': {
        'properties': {
          'p1': 'v1'
        }
      }
    };
    var stepConfig = App.ServiceConfig.create({
      serviceName: 'serviceName1',
      configs: []
    });
    var cases = [
      {
        m: 'allowUpdateProperty true',
        allowUpdateProperty: true
      },
      {
        m: 'allowUpdateProperty false',
        allowUpdateProperty: false
      }
    ];
    cases.forEach(function (c) {
      describe('non error case', function() {
        beforeEach(function() {
          sinon.stub(App.config, 'getStepConfigForProperty').returns(stepConfig);
          sinon.stub(instanceObject, 'allowUpdateProperty').returns(c.allowUpdateProperty);
          sinon.stub(instanceObject, '_createNewProperty').returns(App.ServiceConfigProperty.create({
            'name': 'p1',
            'filename': 'file-name'
          }));
          instanceObject.addByRecommendations(_recommendationObject, []);
        });

        afterEach(function() {
          App.config.getStepConfigForProperty.restore();
          instanceObject.allowUpdateProperty.restore();
          instanceObject._createNewProperty.restore();
        });

        if (c.allowUpdateProperty) {
          it ('adds new property', function() {
            expect(instanceObject._createNewProperty.calledWith('p1', 'file-name', 'serviceName1', 'v1', [])).to.be.true;

            expect(stepConfig.get('configs.0')).to.eql(App.ServiceConfigProperty.create({
              'name': 'p1',
              'filename': 'file-name'
            }));
          });

        } else {
          it('does  not add property error', function() {
            expect(instanceObject._createNewProperty.called).to.be.false;
          });
        }
      });
    });

    it('throws error', function() {
      expect(instanceObject.addByRecommendations.bind(instanceObject, null)).to.throw(App.ObjectTypeError);
    });
  });

  describe('#_updateConfigByRecommendation', function() {
    var cases = [
      {
        'allowUpdateProperty': true,
        'updateInitialOnRecommendations': true,
        'm': 'allowUpdateProperty and update init on recommendation',
        'result': {
          'recommendedValue': 'recommendedValue',
          'value': 'recommendedValue',
          'initialValue': 'recommendedValue'
        }
      },
      {
        'allowUpdateProperty': true,
        'updateInitialOnRecommendations': false,
        'm': 'allowUpdateProperty and do not update init on recommendation',
        'result': {
          'recommendedValue': 'recommendedValue',
          'value': 'recommendedValue',
          'initialValue': null
        }
      },
      {
        'allowUpdateProperty': false,
        'updateInitialOnRecommendations': false,
        'm': 'do not allowUpdateProperty and do not update init on recommendation',
        'result': {
          'recommendedValue': 'recommendedValue',
          'value': null,
          'initialValue': null
        }
      }
    ];

    cases.forEach(function(c) {
      describe('update recommendation', function() {
        beforeEach(function() {
          sinon.spy(instanceObject, 'applyRecommendation');
          sinon.stub(instanceObject, 'allowUpdateProperty').returns(c.allowUpdateProperty);
          sinon.stub(instanceObject, 'updateInitialOnRecommendations').returns(c.updateInitialOnRecommendations);
        });
        afterEach(function() {
          instanceObject.allowUpdateProperty.restore();
          instanceObject.updateInitialOnRecommendations.restore();
          instanceObject.applyRecommendation.restore();
        });

        it(c.m, function() {
          expect(instanceObject._updateConfigByRecommendation({
            'recommendedValue': null,
            'value': null,
            'initialValue': null
          }, 'recommendedValue')).to.eql(c.result);
        });

        if(c.allowUpdateProperty) {
          it('runs applyRecommendation', function() {
            instanceObject._updateConfigByRecommendation({}, 'recommendedValue');
            expect(instanceObject.applyRecommendation.calledOnce).to.be.true;
          });
        }
      });
    });

    it('throws error for configs', function() {
      expect(instanceObject._updateConfigByRecommendation.bind(instanceObject, null)).to.throw(App.ObjectTypeError);
    });
  });

  describe('#_createNewProperty', function() {
    beforeEach(function() {
      sinon.spy(instanceObject, 'applyRecommendation');
      sinon.stub(instanceObject, '_getCoreProperties').returns({
        'value': 'recommendedValue',
        'recommendedValue': 'recommendedValue',
        'initialValue': 'initialValue',
        'savedValue': null
      });
      sinon.stub(App.config, 'getDefaultConfig', function(name, serviceName, fileName, coreObject) {
        coreObject.name = name;
        coreObject.filename = fileName;
        coreObject.serviceName = serviceName;
        return coreObject;
      });
    });
    afterEach(function() {
      instanceObject.applyRecommendation.restore();
      instanceObject._getCoreProperties.restore();
      App.config.getDefaultConfig.restore();
    });
    
    it('adds new config', function() {
      expect(instanceObject._createNewProperty('name', 'fileName', 'serviceName', 'recommendedValue', null)).to.eql(App.ServiceConfigProperty.create({
        'value': 'recommendedValue',
        'recommendedValue': 'recommendedValue',
        'initialValue': 'initialValue',
        'savedValue': null,
        'name': 'name',
        'filename': 'fileName',
        'serviceName': 'serviceName'
      }));

      expect(instanceObject.applyRecommendation.calledOnce).to.be.true;
    });

    it('throws error for name/fileName/serviceName', function() {
      expect(instanceObject._createNewProperty.bind(instanceObject)).to.throw(App.NotNullTypeError);
      expect(instanceObject._createNewProperty.bind(instanceObject, 'name')).to.throw(App.NotNullTypeError);
    });
  });

  describe('#_removeConfigByRecommendation', function() {
    beforeEach(function() {
      sinon.spy(instanceObject, 'applyRecommendation');
    });
    afterEach(function() {
      instanceObject.applyRecommendation.restore();
    });
    
    it('removes config', function() {
      var configCollection = [
        {'name': 'cfg1'},
        {'name': 'cfg2'}
      ];
      instanceObject._removeConfigByRecommendation(configCollection[0], configCollection);
      expect(configCollection[0]).to.eql({'name': 'cfg2'});
      expect(instanceObject.applyRecommendation.calledOnce).to.be.true;
    });

    it('throws error', function() {
      expect(instanceObject._removeConfigByRecommendation.bind(instanceObject, null)).to.throw(App.ObjectTypeError);
    });

    it('throws error (2)', function() {
      expect(instanceObject._removeConfigByRecommendation.bind(instanceObject, {}, null)).to.throw(App.ArrayTypeError);
    });
  });

  describe('#_updateBoundaries', function() {
    it('sets appropriate attribute', function() {
      expect(instanceObject._updateBoundaries({}, 'attr1', 'v1')).to.eql({ valueAttributes: {'attr1': 'v1'}});
    });

    it('throws error', function() {
      expect(instanceObject._updateBoundaries.bind(instanceObject, null, 'attr1', 'v1')).to.throw(App.ObjectTypeError);
    });
  });

  describe('#_getCoreProperties', function() {
    var cases = [
      {
        'useInitialValue': true,
        'updateInitialOnRecommendations': true,
        'm': 'use init and update init on recommendation',
        'result': {
          'value': 'recommendedValue',
          'recommendedValue': 'recommendedValue',
          'initialValue': 'recommendedValue',
          'savedValue': null
        }
      },
      {
        'useInitialValue': true,
        'updateInitialOnRecommendations': false,
        'm': 'use init and do not update init on recommendation',
        'result': {
          'value': 'recommendedValue',
          'recommendedValue': 'recommendedValue',
          'initialValue': 'initValue',
          'savedValue': null
        }
      },
      {
        'useInitialValue': false,
        'updateInitialOnRecommendations': false,
        'm': 'do not use init and do not update init on recommendation',
        'result': {
          'value': 'recommendedValue',
          'recommendedValue': 'recommendedValue',
          'initialValue': 'initValue',
          'savedValue': 'initValue'
        }
      }
    ];
    cases.forEach(function(c) {
      describe('get core object for different cases', function() {
        beforeEach(function() {
          sinon.stub(instanceObject, 'useInitialValue').returns(c.useInitialValue);
          sinon.stub(instanceObject, 'updateInitialOnRecommendations').returns(c.updateInitialOnRecommendations);
        });
        afterEach(function() {
          instanceObject.useInitialValue.restore();
          instanceObject.updateInitialOnRecommendations.restore();
        });
        it(c.m, function() {
          expect(instanceObject._getCoreProperties('serviceName', 'recommendedValue', 'initValue')).to.eql(c.result);
        })
      })
    });
  });

  describe('#_getInitialFromRecommendations', function() {
    beforeEach(function() {
      instanceObject.set('recommendations', [
        {
          propertyName: 'p1',
          propertyFileName: 'f1',
          configGroup: 'Default',
          initialValue: 'initValue'
        }
      ])
    });

    it('get init value from recommendations', function() {
      expect(instanceObject._getInitialFromRecommendations('p1','f1')).to.equal('initValue');
    });

    it('recommendation does not exist', function() {
      expect(instanceObject._getInitialFromRecommendations('p2','f2')).to.equal(null);
    });
  });

  describe('#_getInitialValue', function() {
    beforeEach(function() {
      sinon.stub(instanceObject, 'useInitialValue', function(serviceName) {
        return serviceName !== 'serviceNameInstalled'
      })
    });
    afterEach(function() {
      instanceObject.useInitialValue.restore();
    });

    it('use initialValue', function() {
      expect(instanceObject._getInitialValue({
        serviceName: 'serviceNameNotInstalled',
        initialValue: 'initV',
        savedValue: 'savedV'
      })).to.equal('initV');
    });

    it('use savedValue', function() {
      expect(instanceObject._getInitialValue({
        serviceName: 'serviceNameInstalled',
        initialValue: 'initV',
        savedValue: 'savedV'
      })).to.equal('savedV');
    });

    it('wrong params', function() {
      expect(instanceObject._getInitialValue()).to.be.null;
    });
  });

  describe('#updateInitialOnRecommendations', function() {
    it('default value for updateInitialOnRecommendations is true', function() {
      expect(instanceObject.updateInitialOnRecommendations()).to.be.false;
    })
  });

  describe('#useInitialValue', function() {
    it('default value for useInitialValue is false', function() {
      expect(instanceObject.useInitialValue()).to.be.false;
    })
  });

  describe('#allowUpdateProperty', function() {



    var cases = [{
      saveRecommended: true
    },{
      saveRecommended: false
    }];

    cases.forEach(function(c) {
      describe('allowUpdateProperty based on saveRecommended:' + c.saveRecommended, function() {
        beforeEach(function() {
          sinon.stub(instanceObject, 'getRecommendation').returns({saveRecommended: c.saveRecommended});
        });
        afterEach(function() {
          instanceObject.getRecommendation.restore();
        });
        it('default value for allowUpdateProperty is true', function() {
          expect(instanceObject.allowUpdateProperty()).to.equal(c.saveRecommended);
        });
      });
    });

    it('default value for allowUpdateProperty is true', function() {
      expect(instanceObject.allowUpdateProperty()).to.be.true;
    });
  });
});


