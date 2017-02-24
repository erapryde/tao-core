define([
    'jquery',
    'ui/hider',
    'ui/stacker',
    'ui/component',
    'ui/component/stackable'
], function ($, hider, stackerFactory, componentFactory, makeStackable) {
    'use strict';

    var fixtureContainer = '#qunit-fixture',
        stackingScope = 'myScope',
        stacker = stackerFactory(stackingScope);

    QUnit.module('plugin');

    QUnit.test('module', function (assert) {
        QUnit.expect(1);

        assert.ok(typeof makeStackable === 'function', 'The module expose a function');
    });

    QUnit.module('stackable');

    QUnit.test('regular component has no z-index behavior', function (assert) {
        var $container = $(fixtureContainer),
            component = componentFactory({}, { stackingScope: stackingScope })
                .init()
                .render($container)
                .show(),
            $element = component.getElement();

        QUnit.expect(3);

        assert.ok(! hider.isHidden($element), 'component is visible');
        assert.equal($element.css('z-index'), 'auto', 'component has no z-index');

        $element.trigger('click');
        assert.equal($element.css('z-index'), 'auto', 'component has still no z-index');
    });

    QUnit.test('bring component to front on .render()', function(assert) {
        var $container = $(fixtureContainer),
            component = makeStackable(componentFactory({}, { stackingScope: stackingScope }))
                .init()
                .render($container),
            $element = component.getElement();

        QUnit.expect(2);

        $element.css('position: relative');

        assert.ok(! hider.isHidden($element), 'component is visible');
        assert.equal($element.get(0).style.zIndex, stacker.getCurrent(), 'component has the latest z-index');
    });

    QUnit.test('bring component to front on .show()', function(assert) {
        var $container = $(fixtureContainer),
            component = makeStackable(componentFactory({}, { stackingScope: stackingScope }))
                .init()
                .render($container),
            $element = component.getElement();

        QUnit.expect(4);

        $element.css('position: relative');

        assert.ok(! hider.isHidden($element), 'component is visible');
        assert.equal($element.get(0).style.zIndex, stacker.getCurrent(), 'component has been brought to the front');

        // put another element on top of the component
        stacker.bringToFront($('div'));
        assert.notEqual($element.get(0).style.zIndex, stacker.getCurrent(), 'component is not on the front anymore');

        component.show();
        assert.equal($element.get(0).style.zIndex, stacker.getCurrent(), 'component has been brought back on the front');
    });

    QUnit.test('bring component to front on mousedown', function(assert) {
        var $container = $(fixtureContainer),
            component = makeStackable(componentFactory({}, { stackingScope: stackingScope }))
                .init()
                .render($container),
            $element = component.getElement();

        QUnit.expect(4);

        $element.css('position: relative');

        assert.ok(! hider.isHidden($element), 'component is visible');
        assert.equal($element.get(0).style.zIndex, stacker.getCurrent(), 'component has been brought to the front');

        // put another element on top of the component
        stacker.bringToFront($('div'));
        assert.notEqual($element.get(0).style.zIndex, stacker.getCurrent(), 'component is not on the front anymore');

        $element.trigger('mousedown');
        assert.equal($element.get(0).style.zIndex, stacker.getCurrent(), 'component has been brought back on the front');
    });
});