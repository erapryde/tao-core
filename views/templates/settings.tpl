<?if(get_data('message')):?>
<div id="info-box" class="ui-corner-all auto-highlight auto-hide">
	<?=get_data('message')?>
</div>
<?endif?>

<div id="form-title" class="ui-widget-header ui-corner-top ui-state-default">
	<?=__("My settings")?>
</div>
<div id="form-container" class="ui-widget-content ui-corner-bottom ui-state-default">
	<?=get_data('myForm')?>
</div>

<script type="text/javascript">
$(function(){
	initNavigation();
});
</script>